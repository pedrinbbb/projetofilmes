// ==============================================
//  GOATCINE — Backend Server
//  Node.js + Express + sql.js + JWT + Discord OAuth2 + Email OTP
// ==============================================

require('dotenv').config();

const express    = require('express');
const path       = require('path');
const fs         = require('fs');
const bcrypt     = require('bcryptjs');
const jwt        = require('jsonwebtoken');
const fetch      = require('node-fetch');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const initSqlJs  = require('sql.js');

const app        = express();
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'goatcine_dev_secret';
const DB_PATH    = path.join(__dirname, 'goatcine.db');

// =============================================
//  EMAIL TRANSPORTER
// =============================================
const transporter = nodemailer.createTransport({
  host:   process.env.EMAIL_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.EMAIL_PORT) || 465,
  secure: parseInt(process.env.EMAIL_PORT) === 465, // true para 465, false para outras
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000, // 10 segundos timeout
  dnsTimeout: 10000,
});

function isEmailConfigured() {
  return process.env.EMAIL_USER &&
         process.env.EMAIL_PASS &&
         process.env.EMAIL_USER !== 'seu_email@gmail.com';
}

async function sendVerificationEmail(to, name, code) {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#080808;font-family:'Inter',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="font-size:48px;margin-bottom:12px;">🏆</div>
      <div style="font-size:28px;font-weight:900;color:#F5F5F5;letter-spacing:-0.5px;">
        GOAT<span style="color:#FFD700;">CINE</span>
      </div>
    </div>

    <!-- Card -->
    <div style="background:#111111;border:1px solid rgba(255,215,0,0.2);border-radius:20px;padding:40px 36px;">

      <h1 style="font-size:22px;font-weight:800;color:#F5F5F5;margin:0 0 10px;letter-spacing:-0.3px;">
        Confirme seu email
      </h1>
      <p style="color:#A0A0A0;font-size:15px;line-height:1.6;margin:0 0 32px;">
        Olá, <strong style="color:#F5F5F5;">${name}</strong>! Use o código abaixo para confirmar seu cadastro na GOATCINE.
      </p>

      <!-- OTP Code -->
      <div style="background:#0a0a0a;border:1px solid rgba(255,215,0,0.3);border-radius:14px;padding:28px;text-align:center;margin-bottom:28px;">
        <div style="font-size:11px;font-weight:700;color:#B8860B;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">
          Código de verificação
        </div>
        <div style="font-size:48px;font-weight:900;letter-spacing:14px;color:#FFD700;font-family:monospace;text-shadow:0 0 20px rgba(255,215,0,0.4);">
          ${code}
        </div>
        <div style="font-size:12px;color:#606060;margin-top:12px;">
          Expira em <strong style="color:#A0A0A0;">10 minutos</strong>
        </div>
      </div>

      <p style="color:#606060;font-size:13px;line-height:1.6;margin:0;">
        Se você não solicitou este código, ignore este email com segurança. Nunca compartilhe seu código com ninguém.
      </p>
    </div>

    <!-- Footer -->
    <div style="text-align:center;margin-top:28px;">
      <p style="color:#404040;font-size:12px;margin:0;">
        © 2024 GOATCINE — O Melhor do Cinema, em Dourado.
      </p>
    </div>
  </div>
</body>
</html>
  `;

  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || `GOATCINE <${process.env.EMAIL_USER}>`,
    to,
    subject: `${code} — Seu código GOATCINE`,
    html,
  });
}

// =============================================
//  DATABASE SETUP (sql.js)
// =============================================
let db;

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT    NOT NULL,
      email         TEXT    UNIQUE,
      password_hash TEXT,
      discord_id    TEXT    UNIQUE,
      discord_tag   TEXT,
      avatar        TEXT,
      method        TEXT    NOT NULL DEFAULT 'email',
      created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
      updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL,
      token      TEXT    NOT NULL UNIQUE,
      created_at TEXT    NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT    NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      email       TEXT    NOT NULL,
      name        TEXT    NOT NULL,
      pass_hash   TEXT    NOT NULL,
      code        TEXT    NOT NULL,
      attempts    INTEGER NOT NULL DEFAULT 0,
      expires_at  TEXT    NOT NULL,
      created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);

  saveDb();
  console.log('  ✅ Banco SQLite iniciado');
}

function saveDb() {
  fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
}

// ---- DB Helpers ----
function dbGet(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const row = stmt.step() ? stmt.getAsObject() : null;
    stmt.free();
    return row;
  } catch { return null; }
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDb();
  const res = db.exec('SELECT last_insert_rowid() as id');
  return res[0]?.values[0][0] ?? null;
}

// Generate a 6-digit OTP
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// =============================================
//  MIDDLEWARE
// =============================================
app.use(cors({ origin: process.env.FRONTEND_URL || `http://localhost:${PORT}`, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname)));

// =============================================
//  JWT HELPERS
// =============================================
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, method: user.method },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token não fornecido' });
  const token = authHeader.slice(7);
  try {
    req.user  = jwt.verify(token, JWT_SECRET);
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function safeUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

// =============================================
//  ROUTES — EMAIL AUTH
// =============================================

/**
 * POST /api/auth/register
 * Passo 1: Valida dados e envia código OTP por email
 * Body: { name, email, password }
 * Response: { step: 'verify', email, dev_code? }
 */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validações
    if (!name || name.trim().length < 2)
      return res.status(400).json({ error: 'Nome inválido (mínimo 2 caracteres)' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Email inválido' });
    if (!password || password.length < 8)
      return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });

    const cleanEmail = email.toLowerCase().trim();

    // Email já cadastrado?
    const existing = dbGet('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing) return res.status(409).json({ error: 'Este email já está cadastrado' });

    // Hash da senha já aqui (salvo temporariamente)
    const pass_hash = await bcrypt.hash(password, 12);

    // Remover código antigo para este email (se existir)
    db.run('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
    saveDb();

    // Gerar OTP
    const code      = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

    // Salvar código temporário no banco
    dbRun(
      'INSERT INTO verification_codes (email, name, pass_hash, code, expires_at) VALUES (?, ?, ?, ?, ?)',
      [cleanEmail, name.trim(), pass_hash, code, expiresAt]
    );

    // Enviar email (ou logar no console em modo dev)
    if (isEmailConfigured()) {
      await sendVerificationEmail(cleanEmail, name.trim(), code);
      console.log(`[EMAIL] ✅ Código enviado para: ${cleanEmail}`);
      return res.json({ step: 'verify', email: cleanEmail });
    } else {
      // MODO DEV: email não configurado, retorna código no response
      console.log(`[EMAIL] ⚠️  Dev mode — Código para ${cleanEmail}: ${code}`);
      return res.json({
        step: 'verify',
        email: cleanEmail,
        dev_code: code,
        dev_message: 'Email não configurado. Configure EMAIL_USER e EMAIL_PASS no .env para envio real.',
      });
    }

  } catch (err) {
    console.error('[REGISTER ERROR]', err);
    return res.status(500).json({ error: 'Erro ao enviar código de verificação' });
  }
});

/**
 * POST /api/auth/verify-email
 * Passo 2: Verifica o código OTP e cria a conta
 * Body: { email, code }
 * Response: { token, user }
 */
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code)
      return res.status(400).json({ error: 'Email e código são obrigatórios' });

    const cleanEmail = email.toLowerCase().trim();
    const record     = dbGet(
      'SELECT * FROM verification_codes WHERE email = ?',
      [cleanEmail]
    );

    // Não existe código para este email
    if (!record)
      return res.status(400).json({ error: 'Código não encontrado. Faça o cadastro novamente.' });

    // Código expirado?
    if (new Date() > new Date(record.expires_at)) {
      db.run('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
      saveDb();
      return res.status(400).json({ error: 'Código expirado. Faça o cadastro novamente.', expired: true });
    }

    // Muitas tentativas?
    if (record.attempts >= 5) {
      db.run('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
      saveDb();
      return res.status(400).json({ error: 'Muitas tentativas. Faça o cadastro novamente.', expired: true });
    }

    // Código errado?
    if (record.code !== String(code).trim()) {
      db.run('UPDATE verification_codes SET attempts = attempts + 1 WHERE email = ?', [cleanEmail]);
      saveDb();
      const remaining = 4 - record.attempts;
      return res.status(400).json({
        error: `Código incorreto. ${remaining} tentativa(s) restante(s).`,
        attempts_left: remaining
      });
    }

    // ✅ Código correto — criar usuário!
    db.run('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
    saveDb();

    // Verificar se email não foi cadastrado enquanto aguardava
    const alreadyExists = dbGet('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (alreadyExists)
      return res.status(409).json({ error: 'Este email já está cadastrado.' });

    // Inserir usuário
    dbRun(
      `INSERT INTO users (name, email, password_hash, method) VALUES (?, ?, ?, 'email')`,
      [record.name, cleanEmail, record.pass_hash]
    );

    const user = dbGet('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    const token = generateToken(user);

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    dbRun('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt]);

    console.log(`[AUTH] ✅ Conta criada: ${cleanEmail}`);
    return res.status(201).json({ token, user: safeUser(user) });

  } catch (err) {
    console.error('[VERIFY EMAIL ERROR]', err);
    return res.status(500).json({ error: 'Erro ao verificar código' });
  }
});

/**
 * POST /api/auth/resend-code
 * Reenvia o código OTP
 * Body: { email }
 */
app.post('/api/auth/resend-code', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });

    const cleanEmail = email.toLowerCase().trim();
    const record = dbGet('SELECT * FROM verification_codes WHERE email = ?', [cleanEmail]);

    if (!record)
      return res.status(400).json({ error: 'Nenhum cadastro pendente para este email.' });

    // Cooldown: não reenviar antes de 60 segundos
    const created = new Date(record.created_at);
    const diff    = (Date.now() - created.getTime()) / 1000;
    if (diff < 60) {
      const wait = Math.ceil(60 - diff);
      return res.status(429).json({ error: `Aguarde ${wait}s para reenviar.`, wait });
    }

    // Novo código
    const newCode   = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    db.run(
      'UPDATE verification_codes SET code = ?, attempts = 0, expires_at = ?, created_at = datetime(\'now\') WHERE email = ?',
      [newCode, expiresAt, cleanEmail]
    );
    saveDb();

    if (isEmailConfigured()) {
      await sendVerificationEmail(cleanEmail, record.name, newCode);
      console.log(`[EMAIL] ✅ Código reenviado para: ${cleanEmail}`);
      return res.json({ success: true });
    } else {
      console.log(`[EMAIL] ⚠️  Dev mode — Novo código para ${cleanEmail}: ${newCode}`);
      return res.json({ success: true, dev_code: newCode });
    }

  } catch (err) {
    console.error('[RESEND CODE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao reenviar código' });
  }
});

/**
 * POST /api/auth/login
 */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const targetEmail = email.toLowerCase().trim();
    console.log(`[LOGIN-DEBUG] Tentando login para: ${targetEmail}`);

    const user = dbGet('SELECT * FROM users WHERE email = ?', [targetEmail]);
    if (!user) {
      console.log(`[LOGIN-DEBUG] Usuário NÃO encontrado no banco para o email: ${targetEmail}`);
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    if (!user.password_hash) {
      console.log(`[LOGIN-DEBUG] Usuário encontrado, mas não possui hash de senha (login via Discord?)`);
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    console.log(`[LOGIN-DEBUG] Comparação do bcrypt para ${targetEmail}: ${isValid ? 'VÁLIDO ✅' : 'INVÁLIDO ❌'}`);

    if (!isValid)
      return res.status(401).json({ error: 'Email ou senha incorretos' });

    const token     = generateToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    dbRun('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt]);

    console.log(`[AUTH] ✅ Login: ${targetEmail}`);
    return res.json({ token, user: safeUser(user) });

  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return res.status(500).json({ error: 'Erro interno ao fazer login' });
  }
});

// =============================================
//  ROUTES — DISCORD OAUTH2
// =============================================
app.get('/auth/discord', (req, res) => {
  const CLIENT_ID    = process.env.DISCORD_CLIENT_ID;
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI;

  if (!CLIENT_ID || CLIENT_ID === 'SEU_CLIENT_ID_AQUI')
    return res.redirect('/login.html?auth_error=discord_not_configured');

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'identify email',
    prompt:        'none',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

app.get('/auth/discord/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect('/login.html?auth_error=discord_denied');

  try {
    const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
    const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const REDIRECT_URI  = process.env.DISCORD_REDIRECT_URI;

    const tokenRes  = await fetch('https://discord.com/api/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) return res.redirect('/login.html?auth_error=discord_token_failed');

    const userRes     = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userRes.json();
    if (!discordUser.id) return res.redirect('/login.html?auth_error=discord_user_failed');

    const discordName  = discordUser.global_name || discordUser.username;
    const discordEmail = discordUser.email || null;
    const discordTag   = discordUser.username;
    const avatarUrl    = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    let dbUser = dbGet('SELECT * FROM users WHERE discord_id = ?', [discordUser.id]);

    if (dbUser) {
      db.run(
        `UPDATE users SET name=?, discord_tag=?, avatar=?, updated_at=datetime('now') WHERE discord_id=?`,
        [discordName, discordTag, avatarUrl, discordUser.id]
      );
      saveDb();
      dbUser = dbGet('SELECT * FROM users WHERE discord_id = ?', [discordUser.id]);
    } else {
      const userId = dbRun(
        `INSERT INTO users (name, email, discord_id, discord_tag, avatar, method) VALUES (?, ?, ?, ?, ?, 'discord')`,
        [discordName, discordEmail, discordUser.id, discordTag, avatarUrl]
      );
      dbUser = dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    }

    const token     = generateToken(dbUser);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    dbRun('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)', [dbUser.id, token, expiresAt]);

    console.log(`[AUTH] ✅ Discord: ${discordName}`);
    res.redirect(`/auth-callback.html?token=${encodeURIComponent(token)}&name=${encodeURIComponent(discordName)}`);

  } catch (err) {
    console.error('[DISCORD CALLBACK ERROR]', err);
    res.redirect('/login.html?auth_error=server_error');
  }
});

// =============================================
//  ROUTES — PROTEGIDAS
// =============================================
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  return res.json({ user: safeUser(user) });
});

app.post('/api/auth/logout', requireAuth, (req, res) => {
  dbRun('DELETE FROM sessions WHERE token = ?', [req.token]);
  return res.json({ message: 'Logout realizado' });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  const user = dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
  return res.json({ valid: true, user: safeUser(user) });
});

// =============================================
//  CATCH-ALL
// =============================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// =============================================
//  START
// =============================================
initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('  🏆 GOATCINE Server rodando!');
    console.log('  ─────────────────────────────────────────');
    console.log(`  🌐 Site:  http://localhost:${PORT}`);
    console.log(`  🔑 Login: http://localhost:${PORT}/login.html`);
    console.log('  ─────────────────────────────────────────');

    const discordOk = process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_ID !== 'SEU_CLIENT_ID_AQUI';
    console.log(discordOk ? '  ✅ Discord OAuth: Configurado' : '  ⚠️  Discord: NÃO CONFIGURADO');

    const emailOk = isEmailConfigured();
    console.log(emailOk
      ? `  ✅ Email SMTP: Configurado (${process.env.EMAIL_USER})`
      : '  ⚠️  Email SMTP: NÃO CONFIGURADO — códigos OTP aparecerão no console'
    );
    console.log('');
  });
}).catch(err => { console.error('❌ Erro ao iniciar:', err); process.exit(1); });
