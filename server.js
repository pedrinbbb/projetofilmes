// ==============================================
//  GOATCINE — Backend Server
//  Node.js + Express + sql.js (SQLite puro JS) + JWT + Discord OAuth2
// ==============================================

require('dotenv').config();

const express  = require('express');
const path     = require('path');
const fs       = require('fs');
const bcrypt   = require('bcryptjs');
const jwt      = require('jsonwebtoken');
const fetch    = require('node-fetch');
const cors     = require('cors');
const initSqlJs = require('sql.js');

const app  = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET  = process.env.JWT_SECRET || 'goatcine_dev_secret';
const DB_PATH     = path.join(__dirname, 'goatcine.db');

// =============================================
//  DATABASE SETUP (sql.js — SQLite puro JS)
// =============================================
let db;

async function initDatabase() {
  const SQL = await initSqlJs();

  // Load existing DB or create new
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
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

  saveDb();
  console.log('  ✅ Banco SQLite iniciado');
}

// Save DB to disk after every write
function saveDb() {
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

// ---- DB Helpers ----
function dbGet(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch (e) {
    return null;
  }
}

function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDb();
  return db.exec('SELECT last_insert_rowid() as id')[0]?.values[0][0] ?? null;
}

function dbAll(sql, params = []) {
  try {
    const results = db.exec(sql, params);
    if (!results.length) return [];
    const { columns, values } = results[0];
    return values.map(row => Object.fromEntries(columns.map((c, i) => [c, row[i]])));
  } catch {
    return [];
  }
}

// =============================================
//  MIDDLEWARE
// =============================================
app.use(cors({
  origin: process.env.FRONTEND_URL || `http://localhost:${PORT}`,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files (HTML, CSS, JS)
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

// =============================================
//  AUTH MIDDLEWARE
// =============================================
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }
  const token = authHeader.slice(7);
  try {
    req.user  = jwt.verify(token, JWT_SECRET);
    req.token = token;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// =============================================
//  SAFE USER (sem senha)
// =============================================
function safeUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

// =============================================
//  ROUTES — EMAIL AUTH
// =============================================

/** POST /api/auth/register */
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || name.trim().length < 2)
      return res.status(400).json({ error: 'Nome inválido (mínimo 2 caracteres)' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'Email inválido' });
    if (!password || password.length < 8)
      return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });

    // Email já cadastrado?
    const existing = dbGet('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) return res.status(409).json({ error: 'Este email já está cadastrado' });

    // Hash da senha
    const password_hash = await bcrypt.hash(password, 12);

    // Inserir usuário
    const userId = dbRun(
      `INSERT INTO users (name, email, password_hash, method) VALUES (?, ?, ?, 'email')`,
      [name.trim(), email.toLowerCase().trim(), password_hash]
    );

    const user  = dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    const token = generateToken(user);

    // Salvar sessão
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    dbRun('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt]);

    console.log(`[AUTH] ✅ Registro: ${email}`);
    return res.status(201).json({ token, user: safeUser(user) });

  } catch (err) {
    console.error('[REGISTER ERROR]', err);
    return res.status(500).json({ error: 'Erro interno ao criar conta' });
  }
});

/** POST /api/auth/login */
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });

    const user = dbGet('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);

    if (!user || !user.password_hash)
      return res.status(401).json({ error: 'Email ou senha incorretos' });

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid)
      return res.status(401).json({ error: 'Email ou senha incorretos' });

    const token     = generateToken(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    dbRun('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt]);

    console.log(`[AUTH] ✅ Login: ${email}`);
    return res.json({ token, user: safeUser(user) });

  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return res.status(500).json({ error: 'Erro interno ao fazer login' });
  }
});

// =============================================
//  ROUTES — DISCORD OAUTH2
// =============================================

/** GET /auth/discord — Redireciona para Discord */
app.get('/auth/discord', (req, res) => {
  const CLIENT_ID    = process.env.DISCORD_CLIENT_ID;
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/auth/discord/callback`;

  if (!CLIENT_ID || CLIENT_ID === 'SEU_CLIENT_ID_AQUI') {
    return res.redirect('/?auth_error=discord_not_configured');
  }

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'identify email',
    prompt:        'none',
  });

  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

/** GET /auth/discord/callback — Discord retorna aqui */
app.get('/auth/discord/callback', async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    return res.redirect('/login.html?auth_error=discord_denied');
  }

  try {
    const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
    const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const REDIRECT_URI  = process.env.DISCORD_REDIRECT_URI || `http://localhost:${PORT}/auth/discord/callback`;

    // 1. Trocar code por access_token
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({
        client_id:     CLIENT_ID,
        client_secret: CLIENT_SECRET,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  REDIRECT_URI,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('[DISCORD] Token error:', tokenData);
      return res.redirect('/login.html?auth_error=discord_token_failed');
    }

    // 2. Buscar dados do usuário
    const userRes    = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userRes.json();

    if (!discordUser.id) return res.redirect('/login.html?auth_error=discord_user_failed');

    const discordName  = discordUser.global_name || discordUser.username;
    const discordEmail = discordUser.email || null;
    const discordTag   = `${discordUser.username}`;
    const avatarUrl    = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    // 3. Upsert usuário no banco
    let dbUser = dbGet('SELECT * FROM users WHERE discord_id = ?', [discordUser.id]);

    if (dbUser) {
      // Atualizar
      db.run(
        `UPDATE users SET name = ?, discord_tag = ?, avatar = ?, updated_at = datetime('now') WHERE discord_id = ?`,
        [discordName, discordTag, avatarUrl, discordUser.id]
      );
      saveDb();
      dbUser = dbGet('SELECT * FROM users WHERE discord_id = ?', [discordUser.id]);
    } else {
      // Criar
      const userId = dbRun(
        `INSERT INTO users (name, email, discord_id, discord_tag, avatar, method) VALUES (?, ?, ?, ?, ?, 'discord')`,
        [discordName, discordEmail, discordUser.id, discordTag, avatarUrl]
      );
      dbUser = dbGet('SELECT * FROM users WHERE id = ?', [userId]);
    }

    // 4. Gerar JWT e sessão
    const token     = generateToken(dbUser);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    dbRun('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)', [dbUser.id, token, expiresAt]);

    console.log(`[AUTH] ✅ Discord: ${discordName} (ID: ${discordUser.id})`);

    // 5. Redirecionar com token
    res.redirect(`/auth-callback.html?token=${encodeURIComponent(token)}&name=${encodeURIComponent(discordName)}`);

  } catch (err) {
    console.error('[DISCORD CALLBACK ERROR]', err);
    res.redirect('/login.html?auth_error=server_error');
  }
});

// =============================================
//  ROUTES — PROTEGIDAS
// =============================================

/** GET /api/auth/me */
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
  return res.json({ user: safeUser(user) });
});

/** POST /api/auth/logout */
app.post('/api/auth/logout', requireAuth, (req, res) => {
  dbRun('DELETE FROM sessions WHERE token = ?', [req.token]);
  return res.json({ message: 'Logout realizado' });
});

/** GET /api/auth/verify */
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
    const discordId = process.env.DISCORD_CLIENT_ID;
    if (!discordId || discordId === 'SEU_CLIENT_ID_AQUI') {
      console.log('  ⚠️  Discord: NÃO CONFIGURADO (edite o .env)');
    } else {
      console.log('  ✅ Discord OAuth: Configurado');
    }
    console.log('');
  });
}).catch(err => {
  console.error('❌ Erro ao iniciar banco:', err);
  process.exit(1);
});
