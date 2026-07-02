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
const fetch      = globalThis.fetch || require('node-fetch');
const cors       = require('cors');
const nodemailer = require('nodemailer');
const { Pool }  = require('pg');
const initSqlJs  = require('sql.js');
const crypto     = require('crypto');
const https      = require('https');
const zlib       = require('zlib');

const app        = express();
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'goatcine_dev_secret';
const DEFAULT_POSTER_URL = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%22500%22%20height=%22750%22%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20fill=%22%23000000%22/%3E%3C/svg%3E';
const DEFAULT_BACKDROP_URL = 'data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%221280%22%20height=%22720%22%3E%3Crect%20width=%22100%25%22%20height=%22100%25%22%20fill=%22%23000000%22/%3E%3C/svg%3E';
const DEFAULT_TRAILER_URLS = {
  'Dune: Part Two': 'https://www.youtube.com/watch?v=Way9Dexny3w',
  Oppenheimer: 'https://www.youtube.com/watch?v=uYPbbksJxIg',
  'Poor Things': 'https://www.youtube.com/watch?v=RlbR5N6veqw',
  'The Batman': 'https://www.youtube.com/watch?v=mqqft2x_Aa4',
  Parasite: 'https://www.youtube.com/watch?v=5xH0HfJHsaY',
  Interstellar: 'https://www.youtube.com/watch?v=zSWdZVtXT7E',
  'Past Lives': 'https://www.youtube.com/watch?v=kA244xewjcI',
  'Everything Everywhere': 'https://www.youtube.com/watch?v=wxN1T1UxQ2A',
  'Creed: Nascido para Lutar': 'https://www.youtube.com/watch?v=Uv554B7YHk4',
  'Dupla Perigosa': 'https://www.youtube.com/watch?v=D7oUW5837Tc',
  Furiosa: 'https://www.youtube.com/watch?v=XJMuhwVlca4',
  'Civil War': 'https://www.youtube.com/watch?v=aDyQxtg0V2w',
  Longlegs: 'https://www.youtube.com/watch?v=OG7wOTE8NhE',
  'Inside Out 2': 'https://www.youtube.com/watch?v=LEjhY15eCx0',
  'Alien: Romulus': 'https://www.youtube.com/watch?v=x0XDEy1t9dI',
  'Deadpool & Wolverine': 'https://www.youtube.com/watch?v=73_1biulkYk',
  Challengers: 'https://www.youtube.com/watch?v=VobT0to272U',
  Twisters: 'https://www.youtube.com/watch?v=l49T1Bq-580',
  'Mission: Impossible 7': 'https://www.youtube.com/watch?v=2m1drlOZSDw',
  'Top Gun: Maverick': 'https://www.youtube.com/watch?v=qSqVVswa420',
  'John Wick 4': 'https://www.youtube.com/watch?v=qEVUtrk8_B4',
  'Avatar: The Way of Water': 'https://www.youtube.com/watch?v=d9MyW72ELq0',
  'Black Panther: Wakanda Forever': 'https://www.youtube.com/watch?v=_Z3QKkl1WyM',
  'Gladiator II': 'https://www.youtube.com/watch?v=4rgYUipGJNo',
  'The Fall Guy': 'https://www.youtube.com/watch?v=j7jPnwVGdZ8',
  'Thor: Love and Thunder': 'https://www.youtube.com/watch?v=Go8nTmfrQd8',
  Origem: 'https://www.youtube.com/watch?v=pDHqAj4eJcM',
  'Creed: III': 'https://www.youtube.com/watch?v=AHmCH7iB_IM'
};

// URL de conexão do PostgreSQL
const DATABASE_URL = process.env.DATABASE_URL;

// Fallback para SQLite em desenvolvimento se DATABASE_URL não existir
const PERSISTENT_DIR = fs.existsSync('/data') ? '/data' : (fs.existsSync('/var/data') ? '/var/data' : null);
const DB_PATH    = PERSISTENT_DIR ? path.join(PERSISTENT_DIR, 'goatcine.db') : path.join(__dirname, 'goatcine.db');

// Autenticação única de Admin
let ADMIN_PASSWORD = process.env.ADMIN_PASS;
if (!ADMIN_PASSWORD) {
  ADMIN_PASSWORD = crypto.randomBytes(6).toString('hex'); // 12 caracteres aleatórios hex
}
const ADMIN_JWT_SECRET = JWT_SECRET + '_admin';
const ACTIVE_USER_TTL_MS = 2 * 60 * 1000;
const activeUsers = new Map();


// =============================================
//  EMAIL TRANSPORTER
// =============================================
const EMAIL_HOST = String(process.env.EMAIL_HOST || 'smtp.gmail.com').trim();
const EMAIL_PORT = Number(process.env.EMAIL_PORT || 587);
const EMAIL_SECURE = String(process.env.EMAIL_SECURE || '').toLowerCase() === 'true' || EMAIL_PORT === 465;
const EMAIL_TIMEOUT_MS = Number(process.env.EMAIL_TIMEOUT_MS || 25000);

const EMAIL_USER = String(process.env.EMAIL_USER || '').trim();
const EMAIL_PASS = String(process.env.EMAIL_PASS || '').trim();

const transporter = nodemailer.createTransport({
  host: EMAIL_HOST,
  port: EMAIL_PORT,
  secure: EMAIL_SECURE,
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: EMAIL_TIMEOUT_MS,
  greetingTimeout: EMAIL_TIMEOUT_MS,
  socketTimeout: EMAIL_TIMEOUT_MS
});

function isEmailConfigured() {
  const hasResend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'SUA_CHAVE_AQUI';
  const hasBrevo = process.env.BREVO_API_KEY && process.env.BREVO_API_KEY !== 'SUA_CHAVE_AQUI';
  const hasSmtp = process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_USER !== 'seu_email@gmail.com';
  return hasResend || hasBrevo || hasSmtp;
}

async function sendMailWithTimeout(mailOptions) {
  const BREVO_API_KEY = String(process.env.BREVO_API_KEY || '').trim();
  if (BREVO_API_KEY && BREVO_API_KEY !== 'SUA_CHAVE_AQUI') {
    try {
      console.log('[EMAIL] Enviando via Brevo HTTPS API...');
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { 
            name: 'GOATCINE', 
            email: process.env.EMAIL_FROM || 'goatcineempresa@gmail.com' 
          },
          to: [{ email: mailOptions.to }],
          subject: mailOptions.subject,
          htmlContent: mailOptions.html
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro retornado pela API do Brevo');
      }
      return data;
    } catch (err) {
      console.error('[BREVO API ERROR] Falha ao enviar via Brevo API:', err.message);
      throw err;
    }
  }

  const RESEND_API_KEY = String(process.env.RESEND_API_KEY || '').trim();
  if (RESEND_API_KEY && RESEND_API_KEY !== 'SUA_CHAVE_AQUI') {
    try {
      console.log('[EMAIL] Enviando via Resend HTTPS API...');
      
      // Resend não permite enviar de domínios públicos que não pertencem ao usuário (ex: gmail.com).
      // Se for o caso, forçamos o uso do remetente gratuito do Resend (onboarding@resend.dev).
      let fromSender = mailOptions.from || `GOATCINE <onboarding@resend.dev>`;
      if (
        fromSender.includes('@gmail.com') ||
        fromSender.includes('@hotmail.com') ||
        fromSender.includes('@outlook.com') ||
        fromSender.includes('@yahoo.com') ||
        fromSender.includes('@live.com')
      ) {
        fromSender = `GOATCINE <onboarding@resend.dev>`;
      }

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: fromSender,
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Erro retornado pela API do Resend');
      }
      return data;
    } catch (err) {
      console.error('[RESEND API ERROR] Falha ao enviar via Resend API:', err.message);
      throw err;
    }
  }

  // Fallback para SMTP normal
  return Promise.race([
    transporter.sendMail(mailOptions),
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tempo limite ao enviar e-mail pelo SMTP')), EMAIL_TIMEOUT_MS + 2000);
    })
  ]);
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

  await sendMailWithTimeout({
    from:    process.env.EMAIL_FROM || `GOATCINE <${process.env.EMAIL_USER}>`,
    to,
    subject: `${code} — Seu código GOATCINE`,
    html,
  });
}

async function sendResetPasswordEmail(to, name, code) {
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
        Recupere sua senha
      </h1>
      <p style="color:#A0A0A0;font-size:15px;line-height:1.6;margin:0 0 32px;">
        Olá, <strong style="color:#F5F5F5;">${name}</strong>! Use o código abaixo para redefinir sua senha na GOATCINE.
      </p>

      <!-- OTP Code -->
      <div style="background:#0a0a0a;border:1px solid rgba(255,215,0,0.3);border-radius:14px;padding:28px;text-align:center;margin-bottom:28px;">
        <div style="font-size:11px;font-weight:700;color:#B8860B;letter-spacing:2px;text-transform:uppercase;margin-bottom:12px;">
          Código de redefinição
        </div>
        <div style="font-size:48px;font-weight:900;letter-spacing:14px;color:#FFD700;font-family:monospace;text-shadow:0 0 20px rgba(255,215,0,0.4);">
          ${code}
        </div>
        <div style="font-size:12px;color:#606060;margin-top:12px;">
          Expira em <strong style="color:#A0A0A0;">15 minutos</strong>
        </div>
      </div>

      <p style="color:#606060;font-size:13px;line-height:1.6;margin:0;">
        Se você não solicitou a redefinição de senha, ignore este email com segurança. Nunca compartilhe seu código com ninguém.
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

  await sendMailWithTimeout({
    from:    process.env.EMAIL_FROM || `GOATCINE <${process.env.EMAIL_USER}>`,
    to,
    subject: `${code} — Código de redefinição GOATCINE`,
    html,
  });
}


// =============================================
//  DATABASE SETUP (PostgreSQL / SQLite fallback)
// =============================================
let db;      // Armazena a base SQLite se usado fallback
let pgPool;  // Armazena o Pool do PostgreSQL
const IS_POSTGRES = !!DATABASE_URL;

async function initDatabase() {
  console.log(`[DB INIT] Tentando inicializar banco de dados...`);
  
  if (IS_POSTGRES) {
    console.log(`[DB INIT] Modo de produção PostgreSQL ativado.`);
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false } // Requerido para conexão segura no Render
    });

    // Testar conexão
    try {
      const client = await pgPool.connect();
      console.log(`[DB INIT] Conexão com o banco PostgreSQL efetuada com sucesso!`);
      client.release();
    } catch (err) {
      console.error(`[DB INIT] FALHA ao conectar no PostgreSQL:`, err.message);
      process.exit(1);
    }
  } else {
    console.log(`[DB INIT] Modo de desenvolvimento local SQLite ativado.`);
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      console.log(`[DB INIT] Carregando banco de dados SQLite existente do disco.`);
      db = new SQL.Database(fs.readFileSync(DB_PATH));
    } else {
      console.log(`[DB INIT] Banco SQLite não encontrado no caminho. Criando um novo.`);
      db = new SQL.Database();
    }
  }

  // Executar criação de tabelas e seeds dinamicamente
  await runMigrationsAndSeeds();
}

async function runMigrationsAndSeeds() {
  const AUTO_ID = IS_POSTGRES ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';

  // Criar tabelas usando dbRunSync que é compatível com ambos
  await dbRunSync(`
    CREATE TABLE IF NOT EXISTS users (
      id            ${AUTO_ID},
      name          VARCHAR(255) NOT NULL,
      email         VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255),
      discord_id    VARCHAR(255) UNIQUE,
      discord_tag   VARCHAR(255),
      avatar        VARCHAR(255),
      method        VARCHAR(50) NOT NULL DEFAULT 'email',
      created_at    VARCHAR(100) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    VARCHAR(100) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      sub_active        INTEGER DEFAULT 0,
      sub_plan_id       INTEGER DEFAULT NULL,
      sub_expires_at    VARCHAR(100) DEFAULT NULL,
      sub_activated_at  VARCHAR(100) DEFAULT NULL,
      pending_txid      VARCHAR(255) DEFAULT NULL,
      pending_plan_id   INTEGER DEFAULT NULL,
      has_used_trial    INTEGER DEFAULT 0
    )`);
  await dbRunSync(`
    CREATE TABLE IF NOT EXISTS sessions (
      id         ${AUTO_ID},
      user_id    INTEGER NOT NULL,
      token      VARCHAR(255) NOT NULL UNIQUE,
      created_at VARCHAR(100) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      expires_at VARCHAR(100) NOT NULL
    )`);

  await dbRunSync(`
    CREATE TABLE IF NOT EXISTS verification_codes (
      id          ${AUTO_ID},
      email       VARCHAR(255) NOT NULL,
      name        VARCHAR(255) NOT NULL,
      pass_hash   VARCHAR(255) NOT NULL,
      code        VARCHAR(50) NOT NULL,
      attempts    INTEGER NOT NULL DEFAULT 0,
      expires_at  VARCHAR(100) NOT NULL,
      created_at  VARCHAR(100) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

  await dbRunSync(`
    CREATE TABLE IF NOT EXISTS movies (
      id          ${AUTO_ID},
      title       VARCHAR(255) NOT NULL,
      year        INTEGER NOT NULL,
      duration    VARCHAR(100) NOT NULL,
      rating      DOUBLE PRECISION NOT NULL,
      genre       VARCHAR(255) NOT NULL,
      "desc"      TEXT NOT NULL,
      poster      VARCHAR(500) NOT NULL,
      backdrop    VARCHAR(500) NOT NULL,
      director    VARCHAR(255) NOT NULL,
      "cast"      TEXT NOT NULL,
      category    VARCHAR(100) NOT NULL,
      type        VARCHAR(50) NOT NULL DEFAULT 'movie',
      videoUrl    VARCHAR(500) NOT NULL,
      trailerUrl  VARCHAR(500) DEFAULT NULL,
      subtitlesUrl VARCHAR(500) DEFAULT NULL,
      position    INTEGER NOT NULL DEFAULT 0
    )`);

  await dbRunSync(`
    CREATE TABLE IF NOT EXISTS episodes (
      id          ${AUTO_ID},
      movie_id    INTEGER NOT NULL,
      season      INTEGER NOT NULL,
      number      INTEGER NOT NULL,
      title       VARCHAR(255) NOT NULL,
      duration    VARCHAR(100) NOT NULL,
      videoUrl    VARCHAR(500) NOT NULL,
      subtitlesUrl VARCHAR(500) DEFAULT NULL,
      "desc"      TEXT DEFAULT '',
      created_at  VARCHAR(100) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE
    )`);

  await dbRunSync(`
    CREATE TABLE IF NOT EXISTS profiles (
      id           ${AUTO_ID},
      user_id      INTEGER NOT NULL,
      name         VARCHAR(255) NOT NULL,
      avatar_color VARCHAR(50) NOT NULL DEFAULT '#FFD700',
      avatar_icon  VARCHAR(500) NOT NULL DEFAULT '🎬',
      pin_hash     VARCHAR(255) DEFAULT NULL,
      is_kid       INTEGER NOT NULL DEFAULT 0,
      created_at   VARCHAR(100) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);

  await dbRunSync(`
    CREATE TABLE IF NOT EXISTS plans (
      id            ${AUTO_ID},
      name          VARCHAR(255) NOT NULL,
      price         DOUBLE PRECISION NOT NULL,
      screens       INTEGER NOT NULL,
      duration_days INTEGER NOT NULL DEFAULT 30
    )`);

  await dbRunSync(`
    CREATE TABLE IF NOT EXISTS payment_logs (
      id         ${AUTO_ID},
      user_id    INTEGER,
      plan_id    INTEGER,
      txid       VARCHAR(255) UNIQUE,
      amount     DOUBLE PRECISION,
      status     VARCHAR(50) DEFAULT 'pending',
      created_at VARCHAR(100) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      paid_at    VARCHAR(100)
    )`);

  // Em PostgreSQL as colunas de migração já foram declaradas no CREATE TABLE IF NOT EXISTS users. 
  // Caso estejamos em SQLite, garantimos rodando:
  if (!IS_POSTGRES) {
    try { db.run("ALTER TABLE movies ADD COLUMN type TEXT DEFAULT 'movie'"); } catch (e) {}
    try { db.run("ALTER TABLE movies ADD COLUMN subtitlesUrl TEXT DEFAULT NULL"); } catch (e) {}
    try { db.run("ALTER TABLE movies ADD COLUMN trailerUrl TEXT DEFAULT NULL"); } catch (e) {}
    try { db.run("ALTER TABLE episodes ADD COLUMN subtitlesUrl TEXT DEFAULT NULL"); } catch (e) {}
    try { db.run("ALTER TABLE movies ADD COLUMN position INTEGER DEFAULT 0"); } catch (e) {}
    try { db.run("ALTER TABLE profiles ADD COLUMN pin_hash TEXT DEFAULT NULL"); } catch (e) {}
    try { db.run('ALTER TABLE plans ADD COLUMN duration_days INTEGER DEFAULT 30'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN sub_active INTEGER DEFAULT 0'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN sub_plan_id INTEGER DEFAULT NULL'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN sub_expires_at TEXT DEFAULT NULL'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN sub_activated_at TEXT DEFAULT NULL'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN pending_txid TEXT DEFAULT NULL'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN pending_plan_id INTEGER DEFAULT NULL'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN has_used_trial INTEGER DEFAULT 0'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN discord_id TEXT DEFAULT NULL'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN discord_tag TEXT DEFAULT NULL'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN avatar TEXT DEFAULT NULL'); } catch (e) {}
    try { db.run("ALTER TABLE users ADD COLUMN method TEXT DEFAULT 'email'"); } catch (e) {}
  } else {
    await dbRunSync("ALTER TABLE movies ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'movie'");
    await dbRunSync("ALTER TABLE movies ADD COLUMN IF NOT EXISTS subtitlesUrl VARCHAR(500) DEFAULT NULL");
    await dbRunSync("ALTER TABLE movies ADD COLUMN IF NOT EXISTS trailerUrl VARCHAR(500) DEFAULT NULL");
    await dbRunSync("ALTER TABLE episodes ADD COLUMN IF NOT EXISTS subtitlesUrl VARCHAR(500) DEFAULT NULL");
    await dbRunSync("ALTER TABLE movies ADD COLUMN IF NOT EXISTS position INTEGER DEFAULT 0");
    await dbRunSync("ALTER TABLE profiles ALTER COLUMN avatar_icon TYPE VARCHAR(500)");
    await dbRunSync("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(255) DEFAULT NULL");
    await dbRunSync("ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id VARCHAR(255) UNIQUE DEFAULT NULL");
    await dbRunSync("ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_tag VARCHAR(255) DEFAULT NULL");
    await dbRunSync("ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(255) DEFAULT NULL");
    await dbRunSync("ALTER TABLE users ADD COLUMN IF NOT EXISTS method VARCHAR(50) DEFAULT 'email'");
  }

  await dbRunSync('CREATE INDEX IF NOT EXISTS idx_episodes_movie_season_number ON episodes (movie_id, season, number)');
  if (!IS_POSTGRES) saveDb();

  // Seed de planos
  try {
    const plansRes = await dbGetAsync('SELECT COUNT(*) as count FROM plans');
    const plansCount = plansRes ? (plansRes.count ?? plansRes.COUNT ?? 0) : 0;
    if (Number(plansCount) === 0) {
      console.log('  📦 Semeando planos de assinatura padrão...');
      await dbRunAsync("INSERT INTO plans (id, name, price, screens, duration_days) VALUES (1, 'Bronze', 14.90, 1, 30)");
      await dbRunAsync("INSERT INTO plans (id, name, price, screens, duration_days) VALUES (2, 'Prata', 24.90, 2, 30)");
      await dbRunAsync("INSERT INTO plans (id, name, price, screens, duration_days) VALUES (3, 'Ouro', 44.90, 5, 30)");
    }
  } catch (err) {
    console.error('Erro ao semear planos:', err);
  }

  // Seed de filmes se a tabela estiver vazia
  const countRes = await dbGetAsync('SELECT COUNT(*) as count FROM movies');
  const count = countRes ? (countRes.count ?? countRes.COUNT ?? 0) : 0;
  if (Number(count) === 0) {
    console.log('  📦 Populando tabela de filmes (Seeding)...');
    const defaultMovies = [
      {
        title: "Dune: Part Two",
        year: 2024,
        duration: "2h 46min",
        rating: 8.5,
        genre: "Ficção Científica",
        desc: "Paul Atreides se une a Chani e aos Fremen enquanto busca vingança contra os conspiradores que destruíram sua família. Confrontando uma escolha entre o amor de sua vida e o destino do universo, ele se esforça para evitar um futuro terrível.",
        poster: "https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/xOMo8BRK7PfcJv9JCnx7s5hj0PX.jpg",
        director: "Denis Villeneuve",
        cast: "Timothée Chalamet, Zendaya, Rebecca Ferguson",
        category: "trending",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4"
      },
      {
        title: "Oppenheimer",
        year: 2023,
        duration: "3h 0min",
        rating: 8.3,
        genre: "Drama / História",
        desc: "A história do físico J. Robert Oppenheimer e seu papel no desenvolvimento da primeira bomba atômica durante a Segunda Guerra Mundial. Uma obra-prima cinematográfica de Christopher Nolan.",
        poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/rLb2cwF3Pazuxaj0sRXQ037tGI1.jpg",
        director: "Christopher Nolan",
        cast: "Cillian Murphy, Emily Blunt, Matt Damon",
        category: "trending",
        videoUrl: "https://www.youtube.com/watch?v=F3OxA9C30dQ"
      },
      {
        title: "Poor Things",
        year: 2023,
        duration: "2h 21min",
        rating: 8.0,
        genre: "Fantasia / Drama",
        desc: "A incrível história de Bella Baxter, uma jovem mulher trazida de volta à vida pelo brilhante e incomum cientista Dr. Godwin Baxter. Sob a proteção de Baxter, Bella anseia por aprender.",
        poster: "https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXIf8XMjUZbCIOI.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/5YZbUmjbMa3ClvSoRdnMYJi7LVKS.jpg",
        director: "Yorgos Lanthimos",
        cast: "Emma Stone, Mark Ruffalo, Willem Dafoe",
        category: "trending",
        videoUrl: "https://www.youtube.com/watch?v=Rrvn_LSDzZg"
      },
      {
        title: "The Batman",
        year: 2022,
        duration: "2h 56min",
        rating: 7.8,
        genre: "Ação / Drama",
        desc: "No segundo ano de Batman patrulhando Gotham, um assassino em série conhecido como Charada começa a deixar pistas enigmáticas, desafiando o Cavaleiro das Trevas a descobrir sua identidade.",
        poster: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/b0PlSFdDwbyK0cf5RxwDpaOJQvQ.jpg",
        director: "Matt Reeves",
        cast: "Robert Pattinson, Zoë Kravitz, Paul Dano",
        category: "trending",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
      },
      {
        title: "Parasite",
        year: 2019,
        duration: "2h 12min",
        rating: 8.5,
        genre: "Thriller / Drama",
        desc: "Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan. Vencedor do Oscar de Melhor Filme.",
        poster: "https://image.tmdb.org/t/p/w500/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/TU9NIjwzjoKPwQHoKn5HEhkEL3.jpg",
        director: "Bong Joon Ho",
        cast: "Song Kang-ho, Lee Sun-kyun, Cho Yeo-jeong",
        category: "trending",
        videoUrl: "https://www.youtube.com/watch?v=5xH0HfJHsaY"
      },
      {
        title: "Interstellar",
        year: 2014,
        duration: "2h 49min",
        rating: 8.6,
        genre: "Ficção Científica",
        desc: "Equipe de exploradores que viajam por um buraco de minhoca no espaço na tentativa de garantir a sobrevivência da humanidade. Uma jornada épica pelo cosmos com Christopher Nolan.",
        poster: "https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/xJHokMbljvjADYdit5fK5VQsXEG.jpg",
        director: "Christopher Nolan",
        cast: "Matthew McConaughey, Anne Hathaway, Jessica Chastain",
        category: "trending",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4"
      },
      {
        title: "Past Lives",
        year: 2023,
        duration: "1h 46min",
        rating: 7.9,
        genre: "Romance / Drama",
        desc: "Duas amizades de infância são separadas depois que uma delas emigra da Coreia. Vinte anos depois, eles se reencontram em Nova York por uma semana enquanto confrontam o que poderia ter sido.",
        poster: "https://image.tmdb.org/t/p/w500/k3waqVXSngKtCCpGhRZNsOlCgXB.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/eHMh7kChaNeD4VTdMhZuFlatNSA.jpg",
        director: "Celine Song",
        cast: "Greta Lee, Teo Yoo, John Magaro",
        category: "trending",
        videoUrl: "https://www.youtube.com/watch?v=kA244xewjcI"
      },
      {
        title: "Everything Everywhere",
        year: 2022,
        duration: "2h 19min",
        rating: 7.8,
        genre: "Ação / Comédia",
        desc: "An aging Chinese immigrant is swept up in an insane adventure, where she alone can save the world by exploring other universes connecting with the lives she could have led.",
        poster: "https://image.tmdb.org/t/p/w500/w3LxiVYdWWRvEVdn5RYq6jIqkb1.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/feSiISwgEpVzR1v3zv2n2LsbXLC.jpg",
        director: "Daniel Kwan",
        cast: "Michelle Yeoh, Ke Huy Quan, Jamie Lee Curtis",
        category: "trending",
        videoUrl: "https://www.youtube.com/watch?v=wxN1T1UxQ2A"
      },
      {
        title: "Creed: Nascido para Lutar",
        year: 2016,
        duration: "2h 13min",
        rating: 7.6,
        genre: "Ação / Drama",
        desc: "Adonis Johnson, filho do campeão de boxe Apollo Creed, decide seguir os passos do pai. Ele viaja para Filadélfia e convence Rocky Balboa, o antigo rival e amigo de seu pai, a ser seu treinador.",
        poster: "creed_poster.png",
        backdrop: "creed_backdrop.png",
        director: "Ryan Coogler",
        cast: "Michael B. Jordan, Sylvester Stallone, Tessa Thompson",
        category: "new",
        videoUrl: "https://pub-288bd4ecd7e6445fa9db9fb2c7c0b087.r2.dev/Creed%20Nascido%20Para%20Lutar%202016%20Bluray%201080p%20Dublado%20-%20WWW.THEPIRATEFILMES.COM.mp4"
      },
      {
        title: "Creed: III",
        year: 2023,
        duration: "1h 56min",
        rating: 7.3,
        genre: "Ação / Drama",
        desc: "Depois de dominar o mundo do boxe, Adonis Creed tem prosperado tanto em sua carreira quanto em sua vida familiar. Quando um amigo de infância e ex-prodígio do boxe, Damian, ressurge após cumprir uma longa pena na prisão, ele está ansioso para provar que merece sua chance no ringue.",
        poster: "https://image.tmdb.org/t/p/w500/cvsXj3DYs52LifH8iFS4t6VvU2n.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/5i6SJUzN2eeU25Z2sLqN5H6s99e.jpg",
        director: "Michael B. Jordan",
        cast: "Michael B. Jordan, Tessa Thompson, Jonathan Majors",
        category: "new",
        videoUrl: "https://pub-288bd4ecd7e6445fa9db9fb2c7c0b087.r2.dev/Dupla.Perigosa.2026.WEB-DL.1080p.x264.DUAL.5.1-SF.mp4"
      },
      {
        title: "Dupla Perigosa",
        year: 2026,
        duration: "2h 15min",
        rating: 8.9,
        genre: "Ação / Conspiração",
        desc: "Dois meios-irmãos que não se falavam há muito tempo se reencontram após a morte misteriosa do pai deles. Ao buscarem a verdade, desvendam segredos de uma conspiração que pode destruir a família.",
        poster: "dupla_perigosa_poster.png",
        backdrop: "dupla_perigosa_backdrop.png",
        director: "Ángel Manuel Soto",
        cast: "Dave Bautista, Jason Momoa, Temuera Morrison",
        category: "new",
        videoUrl: "/api/video/stream?id=16O_SsTEQ3xavbjWNbM2MfpeOsQL7lXS2"
      },
      {
        title: "Furiosa",
        year: 2024,
        duration: "2h 28min",
        rating: 7.8,
        genre: "Ação / Aventura",
        desc: "A origem de Furiosa desde a terra natal e como ela chegou a governar o War Rig. Uma épica de ação e sobrevivência no mundo pós-apocalíptico de Mad Max.",
        poster: "https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xceZprc.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/fqv8v6AycXKsivp1T5yKtLbGXce.jpg",
        director: "George Miller",
        cast: "Anya Taylor-Joy, Chris Hemsworth, Tom Burke",
        category: "new",
        videoUrl: "https://www.youtube.com/watch?v=XJMuhwVlca4"
      },
      {
        title: "Civil War",
        year: 2024,
        duration: "1h 49min",
        rating: 7.3,
        genre: "Ação / Drama",
        desc: "A team of military-embedded journalists race against time to reach DC before rebel factions descend upon the White House. Um olhar perturbador sobre um futuro próximo.",
        poster: "https://image.tmdb.org/t/p/w500/sh7Rg8Er3tFcN9BpKIPOMvALgZd.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/ugS5FVfCI3RV0ZwZtBV3HAV75OX.jpg",
        director: "Alex Garland",
        cast: "Kirsten Dunst, Wagner Moura, Cailee Spaeny",
        category: "new",
        videoUrl: "https://www.youtube.com/watch?v=aDyQxtg0V2w"
      },
      {
        title: "Longlegs",
        year: 2024,
        duration: "1h 41min",
        rating: 6.3,
        genre: "Terror / Thriller",
        desc: "Uma agente do FBI é chamada para ajudar a capturar um serial killer solitário. Um thriller psicológico aterrorizante com Nicolas Cage em performance memorável.",
        poster: "https://image.tmdb.org/t/p/w500/qRaa8x5Q2bAZOaOnLm5K7kPHxij.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/3TNSoa0UHGEzEz5WZOE4BtaEsYE.jpg",
        director: "Osgood Perkins",
        cast: "Maika Monroe, Nicolas Cage, Alicia Witt",
        category: "new",
        videoUrl: "https://www.youtube.com/watch?v=ccWzW5W3S-4"
      },
      {
        title: "Inside Out 2",
        year: 2024,
        duration: "1h 40min",
        rating: 7.5,
        genre: "Animação / Comédia",
        desc: "Riley entra na adolescência e novas emoções surgem na cabeça dela, colocando em risco a harmonia estabelecida pelas emoções originais. Uma sequência emocionante e necessária.",
        poster: "https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/tEHbMiMU0wvtinCJzPAZoMRPWNX.jpg",
        director: "Kelsey Mann",
        cast: "Amy Poehler, Maya Hawke, Kensington Tallman",
        category: "new",
        videoUrl: "https://www.youtube.com/watch?v=LEjhY15eCx0"
      },
      {
        title: "Alien: Romulus",
        year: 2024,
        duration: "1h 59min",
        rating: 7.3,
        genre: "Terror / Ficção",
        desc: "Um grupo de jovens colonizadores do espaço profundo se veem face a face com a forma de vida mais aterrorizante do universo. Um retorno às origens da franquia Alien.",
        poster: "https://image.tmdb.org/t/p/w500/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/9SSEUrSqhljBMzRe4aBTh17rUaC.jpg",
        director: "Fede Álvarez",
        cast: "Cailee Spaeny, David Jonsson, Archie Renaux",
        category: "new",
        videoUrl: "https://www.youtube.com/watch?v=x0XDEy1t9dI"
      },
      {
        title: "Deadpool & Wolverine",
        year: 2024,
        duration: "2h 7min",
        rating: 7.7,
        genre: "Ação / Comédia",
        desc: "Deadpool recruta um relutante Wolverine para uma missão que impacta a história do MCU. O duo mais improvável do cinema em uma aventura caótica e divertida.",
        poster: "https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/yDHYTfA3R0jFYba16jBB1ef8oIt.jpg",
        director: "Shawn Levy",
        cast: "Ryan Reynolds, Hugh Jackman, Emma Corrin",
        category: "new",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4"
      },
      {
        title: "Challengers",
        year: 2024,
        duration: "2h 11min",
        rating: 7.4,
        genre: "Drama / Romance",
        desc: "A former tennis prodigy turned coach puts her husband and her ex-boyfriend, now rivals, against each other. Um triângulo amoroso servido com tensão e estilo por Luca Guadagnino.",
        poster: "https://image.tmdb.org/t/p/w500/H6vke7MJABMCmBT7Kw4PPZP0XT.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/2rmK7mnchw9Xr3XdiAwdt5OXcIh.jpg",
        director: "Luca Guadagnino",
        cast: "Zendaya, Mike Faist, Josh O'Connor",
        category: "new",
        videoUrl: "https://www.youtube.com/watch?v=VobT0to272U"
      },
      {
        title: "Twisters",
        year: 2024,
        duration: "2h 2min",
        rating: 7.2,
        genre: "Ação / Aventura",
        desc: "Kate Cooper, ex-perseguidora de tempestades traumatizada por um incidente no passado, é atraída de volta para as planícies do Oklahoma por seu amigo de infância.",
        poster: "https://image.tmdb.org/t/p/w500/pjnD08FlMAIXsfOLKQbovhFbOpo.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/cOXKUkFKqHQpIVaVZMornoTe6BP.jpg",
        director: "Lee Isaac Chung",
        cast: "Daisy Edgar-Jones, Glen Powell, Anthony Ramos",
        category: "new",
        videoUrl: "https://www.youtube.com/watch?v=l49T1Bq-580"
      },
      {
        title: "Mission: Impossible 7",
        year: 2023,
        duration: "2h 43min",
        rating: 7.7,
        genre: "Ação / Aventura",
        desc: "Ethan Hunt e sua equipe IMF embarcam em sua missão mais perigosa até agora: rastrear uma ameaça de arma nova e terrível antes que ela se espalhe.",
        poster: "https://image.tmdb.org/t/p/w500/NNxYkU70HPurnNCSiCjYAmacwm.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/8Up8DZ8PLRZ23VVUP9mfAzZjRMF.jpg",
        director: "Christopher McQuarrie",
        cast: "Tom Cruise, Hayley Atwell, Ving Rhames",
        category: "action",
        videoUrl: "https://www.youtube.com/watch?v=2m1drlOZSDw"
      },
      {
        title: "Top Gun: Maverick",
        year: 2022,
        duration: "2h 10min",
        rating: 8.2,
        genre: "Ação / Drama",
        desc: "Após mais de trinta anos de serviço como um dos principais pilotos da marinha, Pete Mitchell está onde sempre pertenceu, empurrando o envelope como piloto corajoso.",
        poster: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/AkB5TbGRmItPMNIMODHHCxGBzgs.jpg",
        director: "Joseph Kosinski",
        cast: "Tom Cruise, Miles Teller, Jennifer Connelly",
        category: "action",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/SubaruOutback.mp4"
      },
      {
        title: "John Wick 4",
        year: 2023,
        duration: "2h 49min",
        rating: 7.7,
        genre: "Ação / Thriller",
        desc: "John Wick descobre um caminho para derrotar a Alta Mesa. Mas antes de ganhar sua liberdade, Wick deve enfrentar um novo inimigo com alianças poderosas.",
        poster: "https://image.tmdb.org/t/p/w500/vZloFAK7NmvMGKE7VkF5UHaz0I.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/aeqZdp31F6VBqWmVYKkacfpj7RZ.jpg",
        director: "Chad Stahelski",
        cast: "Keanu Reeves, Donnie Yen, Bill Skarsgård",
        category: "action",
        videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4"
      },
      {
        title: "Avatar: The Way of Water",
        year: 2022,
        duration: "3h 12min",
        rating: 7.6,
        genre: "Ficção / Aventura",
        desc: "Jake Sully e Ney'tiri formaram uma família e fazem tudo para ficar juntos. No entanto, eles devem deixar seu lar e explorar as regiões de Pandora.",
        poster: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/s16H6tpK2utvwDtzZ8Qy8tMp5ED.jpg",
        director: "James Cameron",
        cast: "Sam Worthington, Zoe Saldana, Sigourney Weaver",
        category: "action",
        videoUrl: "https://www.youtube.com/watch?v=d9MyW72ELq0"
      },
      {
        title: "Black Panther: Wakanda Forever",
        year: 2022,
        duration: "2h 41min",
        rating: 7.1,
        genre: "Ação / Aventura",
        desc: "A rainha Ramonda, Shuri, M'Baku, Okoye e os Doras Milaje lutam para proteger sua nação das potências mundiais intervencionistas após a morte do rei T'Challa.",
        poster: "https://image.tmdb.org/t/p/w500/sv1xJUazXoQuI2bsktqKkm59SBHH.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/xDMIl84Qo5Tsu62c9DGWhmPI67A.jpg",
        director: "Ryan Coogler",
        cast: "Letitia Wright, Lupita Nyong'o, Angela Bassett",
        category: "action",
        videoUrl: "https://www.youtube.com/watch?v=_Z3QKkl1WyM"
      },
      {
        title: "Gladiator II",
        year: 2024,
        duration: "2h 28min",
        rating: 6.8,
        genre: "Ação / Drama",
        desc: "Anos após os eventos do primeiro Gladiador, Lucio assiste ao Império Romano ser governado por tiranos. Para poder lutar pelos povos de Roma, ele deve entrar no Coliseu.",
        poster: "https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/tkm9LkM7RfKpTNqpGKJJ8prIqYR.jpg",
        director: "Ridley Scott",
        cast: "Paul Mescal, Pedro Pascal, Denzel Washington",
        category: "action",
        videoUrl: "https://www.youtube.com/watch?v=gT3rXG40a6E"
      },
      {
        title: "The Fall Guy",
        year: 2024,
        duration: "2h 6min",
        rating: 7.2,
        genre: "Ação / Comédia",
        desc: "A stuntman, fresh off an almost career-ending accident, is thrown back into action when the star of a studio's biggest film goes missing.",
        poster: "https://image.tmdb.org/t/p/w500/oBIQDKcqNxKckjugtmzpIIOgoc4.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/H5HjE7Xb9N09rbWn1zBfxgI8uz.jpg",
        director: "David Leitch",
        cast: "Ryan Gosling, Emily Blunt, Winston Duke",
        category: "action",
        videoUrl: "https://www.youtube.com/watch?v=j7jPnwVGdZ8"
      },
      {
        title: "Thor: Love and Thunder",
        year: 2022,
        duration: "1h 59min",
        rating: 6.3,
        genre: "Ação / Fantasia",
        desc: "Thor embarca em uma jornada diferente de tudo que já enfrentou — uma busca pela paz interior. Mas seu retiro é interrompido por um assassino galáctico chamado Gorr.",
        poster: "https://image.tmdb.org/t/p/w500/pIkRyD18kl4FhoCNQuWxWu5cBLM.jpg",
        backdrop: "https://image.tmdb.org/t/p/w1280/57lGJCPuMjCDfRGCsJkEwN9XBKJ.jpg",
        director: "Taika Waititi",
        cast: "Chris Hemsworth, Natalie Portman, Christian Bale",
        category: "action",
        videoUrl: "https://www.youtube.com/watch?v=Go8nTmfrQd8"
      }
    ];

    for (const m of defaultMovies) {
      await dbRunAsync(
        `INSERT INTO movies (title, year, duration, rating, genre, "desc", poster, backdrop, director, "cast", category, videoUrl) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [m.title, m.year, m.duration, m.rating, m.genre, m.desc, m.poster, m.backdrop, m.director, m.cast, m.category, m.videoUrl]
      );
    }
    console.log(`  ✅ ${defaultMovies.length} filmes semeados com sucesso!`);
  }

  // --- SEED SEASONS FOR ORIGEM AUTOMATICALLY ---
  try {
    const movie = await dbGetAsync("SELECT id FROM movies WHERE title = ?", ["Origem"]);
    let movieId;
    if (movie) {
      movieId = movie.id;
      // Garantir que a duração da série seja atualizada no banco
      await dbRunAsync("UPDATE movies SET duration = '4 Temporadas' WHERE id = ?", [movieId]);
    } else {
      movieId = await dbRunAsync(`
        INSERT INTO movies (title, year, duration, rating, genre, "desc", poster, backdrop, director, "cast", category, type, videoUrl, subtitlesUrl, trailerUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        "Origem",
        2022,
        "4 Temporadas",
        7.8,
        "Terror / Drama / Mistério",
        "A trama acompanha os habitantes de uma cidade misteriosa e aterrorizante em algum lugar dos Estados Unidos, da qual ninguém consegue sair. Ao cair da noite, eles precisam se esconder de criaturas monstruosas que emergem da floresta para caçá-los.",
        "https://image.tmdb.org/t/p/w500/a9b8S2QhQ60w4KkK24k30H9qD3g.jpg",
        "https://image.tmdb.org/t/p/w1280/v64U1YV4t8s8pQo4K5x1jJp0f.jpg",
        "John Griffin",
        "Harold Perrineau, Catalina Sandino Moreno, Eion Bailey",
        "series",
        "series",
        "",
        ""
      ]);
      if (!movieId && !IS_POSTGRES) {
        const row = await dbGetAsync("SELECT id FROM movies WHERE title = ?", ["Origem"]);
        movieId = row?.id;
      }
    }

    if (movieId) {
      const season3Episodes = [
        {
          number: 1,
          title: "Estilhaçar",
          duration: "50 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F03-temporada%2F01%2Fstream.m3u8&slug=origem&temporada=3&numero_episodio=1&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Boyd sente a cidade escapar do seu controle à medida que o tempo esfria e os moradores se tornam mais desesperados. Tabitha encontra-se no mundo real e busca ajuda."
        },
        {
          number: 2,
          title: "Quando Nós Vamos",
          duration: "57 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F03-temporada%2F02%2Fstream.m3u8&slug=origem&temporada=3&numero_episodio=2&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Boyd luta para encontrar um caminho a seguir enquanto a cidade se despede de um de seus membros. A saúde de Fátima piora, e Tabitha recebe ajuda de um aliado inesperado."
        },
        {
          number: 3,
          title: "Armadilha para Ratos",
          duration: "45 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F03-temporada%2F03%2Fstream.m3u8&slug=origem&temporada=3&numero_episodio=3&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Kenny lidera um grupo na floresta em busca de comida. Donna e Ellis tentam dissuadir Boyd de um plano perigoso, enquanto Tabitha faz uma descoberta impressionante e Fátima questiona o bem-estar de seu bebê."
        },
        {
          number: 4,
          title: "De Volta e de Novo",
          duration: "44 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F03-temporada%2F04%2Fstream.m3u8&slug=origem&temporada=3&numero_episodio=4&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Boyd é forçado a tomar decisões difíceis quando recém-chegados chegam à cidade ao anoitecer. Victor tenta desenterrar memórias do passado em busca de respostas."
        },
        {
          number: 5,
          title: "A Luz do Dia",
          duration: "51 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F03-temporada%2F05%2Fstream.m3u8&slug=origem&temporada=3&numero_episodio=5&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Victor enfrenta uma lembrança dolorosa de seu passado. Julie busca formas de lidar com seu trauma, Boyd luta para manter a segurança enquanto o julgamento dele é questionado, e Tabitha se ajusta ao novo ambiente."
        },
        {
          number: 6,
          title: "Tecido Cicatricial",
          duration: "53 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F03-temporada%2F06%2Fstream.m3u8&slug=origem&temporada=3&numero_episodio=6&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Fátima e Ellis tomam uma decisão importante sobre a gravidez. As tensões na casa dos Matthews aumentam, e Randall abre-se com Marielle sobre seus medos."
        },
        {
          number: 7,
          title: "Essas Vidas Frágeis",
          duration: "47 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F03-temporada%2F07%2Fstream.m3u8&slug=origem&temporada=3&numero_episodio=7&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "As preocupações com a gravidez de Fátima se aprofundam. Jade segue pistas na floresta, enquanto Julie e Randall buscam um pouco de normalidade."
        },
        {
          number: 8,
          title: "Limiares",
          duration: "48 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F03-temporada%2F08%2Fstream.m3u8&slug=origem&temporada=3&numero_episodio=8&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Após uma tragédia, verdades vêm à tona e acusações surgem. Victor luta para recuperar memórias enterradas, enquanto Julie e Ethan buscam respostas nas ruínas da floresta."
        },
        {
          number: 9,
          title: "Revelações: Capítulo Um",
          duration: "55 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F03-temporada%2F09%2Fstream.m3u8&slug=origem&temporada=3&numero_episodio=9&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "As tensões atingem o ponto mais alto quando os moradores descobrem que um deles desapareceu."
        },
        {
          number: 10,
          title: "Revelações: Capítulo Dois",
          duration: "73 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F03-temporada%2F10%2Fstream.m3u8&slug=origem&temporada=3&numero_episodio=10&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "No final da temporada, Boyd é levado ao limite enquanto o tempo se esgota para alguém que ele ama. A jornada de Tabitha toma um rumo chocante, revelando que a cidade faz parte de um ciclo que exige sacrifícios."
        }
      ];

      for (const ep of season3Episodes) {
        const existing = await dbGetAsync("SELECT id FROM episodes WHERE movie_id = ? AND season = 3 AND number = ?", [movieId, ep.number]);
        if (!existing) {
          await dbRunAsync(`
            INSERT INTO episodes (movie_id, season, number, title, duration, videoUrl, "desc", subtitlesUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [movieId, 3, ep.number, ep.title, ep.duration, ep.videoUrl, ep.desc, ""]);
        }
      }
      console.log("[DB SEED] ✅ Temporada 3 de Origem semeada com sucesso.");

      const season4Episodes = [
        {
          number: 1,
          title: "A Chegada",
          duration: "52 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F04-temporada%2F01%2Fstream.m3u8&slug=origem&temporada=4&numero_episodio=1&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Uma nova chegada lança a cidade no caos. Enquanto isso, Jade e Tabitha lutam com suas revelações na Árvore de Garrafas, e Boyd lida com as implicações do retorno de Smiley."
        },
        {
          number: 2,
          title: "Briga",
          duration: "49 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F04-temporada%2F02%2Fstream.m3u8&slug=origem&temporada=4&numero_episodio=2&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Uma descoberta macabra envia ondas de choque pela cidade. Enquanto a comunidade lida com as consequências dessa descoberta, Jade e Tabitha continuam a lutar com o peso das revelações que encontraram."
        },
        {
          number: 3,
          title: "Alegremente Vamos",
          duration: "48 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F04-temporada%2F03%2Fstream.m3u8&slug=origem&temporada=4&numero_episodio=3&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Boyd tenta salvar Acosta de si mesma enquanto Julie se aprofunda em suas novas habilidades. Em outro lugar, Tabitha embarca em uma jogada desesperada, e Victor se junta a Ethan em uma busca por respostas."
        },
        {
          number: 4,
          title: "De Mitos e Monstros",
          duration: "50 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F04-temporada%2F04%2Fstream.m3u8&slug=origem&temporada=4&numero_episodio=4&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Uma descoberta sinistra força a equipe de Boyd a adotar uma postura defensiva. Julie experimenta suas habilidades emergentes enquanto Sara sofre tormento psicológico por vozes misteriosas. Victor compartilha detalhes com Henry sobre a primeira vez que o Homem de Amarelo chegou."
        },
        {
          number: 5,
          title: "Que Longa e Estranha Viagem Tem Sido",
          duration: "51 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F04-temporada%2F05%2Fstream.m3u8&slug=origem&temporada=4&numero_episodio=5&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "A busca por respostas leva Boyd e Jade a um território inexplorado. Enquanto isso, uma simples entrega de comida no assentamento se transforma em um cenário de pesadelo."
        },
        {
          number: 6,
          title: "O Coração é um Caçador Solitário",
          duration: "47 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F04-temporada%2F06%2Fstream.m3u8&slug=origem&temporada=4&numero_episodio=6&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Surge uma divisão entre Boyd e Jade em relação às visões que Boyd está tendo, mesmo quando notícias alarmantes chegam do assentamento."
        },
        {
          number: 7,
          title: "Planos Bem Traçados",
          duration: "50 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F04-temporada%2F07%2Fstream.m3u8&slug=origem&temporada=4&numero_episodio=7&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "O passado sombrio de Tabitha e Jade vem à tona, e outro morador da cidade enfrenta sérios problemas. Boyd inicia um plano para testar uma teoria arriscada."
        },
        {
          number: 8,
          title: "Pesada é a Cabeça",
          duration: "49 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F04-temporada%2F08%2Fstream.m3u8&slug=origem&temporada=4&numero_episodio=8&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "A busca de Boyd para liderar os moradores de volta para casa atinge um ponto crítico e perigoso. As tensões aumentam enquanto os moradores lutam para entender a natureza de seu confinamento."
        },
        {
          number: 9,
          title: "A Calmaria Antes",
          duration: "48 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F04-temporada%2F09%2Fstream.m3u8&slug=origem&temporada=4&numero_episodio=9&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Enquanto os moradores se preparam para uma missão arriscada de recuperar os ossos das crianças da câmara, a cidade enfrenta uma ameaça sinistra e iminente."
        },
        {
          number: 10,
          title: "Se uma Árvore Cair na Floresta...",
          duration: "75 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FO%2Forigem%2F04-temporada%2F10%2Fstream.m3u8&slug=origem&temporada=4&numero_episodio=10&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "No final da temporada, Jade e Tabitha conseguem extrair os ossos dos túneis, mas a fuga é complicada por uma sabotagem e uma mudança repentina no ambiente da cidade. O céu fica vermelho e o dia vira noite, permitindo uma emboscada dos monstros."
        }
      ];

      for (const ep of season4Episodes) {
        const existing = await dbGetAsync("SELECT id FROM episodes WHERE movie_id = ? AND season = 4 AND number = ?", [movieId, ep.number]);
        if (!existing) {
          await dbRunAsync(`
            INSERT INTO episodes (movie_id, season, number, title, duration, videoUrl, "desc", subtitlesUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [movieId, 4, ep.number, ep.title, ep.duration, ep.videoUrl, ep.desc, ""]);
        }
      }
      console.log("[DB SEED] ✅ Temporada 4 de Origem semeada com sucesso.");
    }
  } catch (err) {
    console.error("[DB SEED ERROR] Erro ao semear Temporada 4 de Origem:", err);
  }

  // --- SEED SEASONS FOR THE LAST OF US AUTOMATICALLY ---
  try {
    const movie = await dbGetAsync("SELECT id FROM movies WHERE title = ?", ["The Last of Us"]);
    let movieId;
    if (movie) {
      movieId = movie.id;
      await dbRunAsync("UPDATE movies SET duration = '2 Temporadas' WHERE id = ?", [movieId]);
    } else {
      await dbRunAsync(`
        INSERT INTO movies (title, year, duration, rating, genre, "desc", poster, backdrop, director, "cast", category, type, videoUrl, subtitlesUrl, trailerUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        "The Last of Us",
        2023,
        "2 Temporadas",
        8.7,
        "Ação / Drama / Ficção Científica",
        "Uma série dramática baseada no aclamado videogame de mesmo nome, onde um sobrevivente endurecido assume a responsabilidade de contrabandear uma garota de 14 anos para fora de uma zona de quarentena opressiva.",
        "https://image.tmdb.org/t/p/w500/uKVQjEUuC19Zq0r486z85g4goIP.jpg",
        "https://image.tmdb.org/t/p/w1280/uDgy6hyPdZ2sbTyIKypw2C46wJm.jpg",
        "Craig Mazin, Neil Druckmann",
        "Pedro Pascal, Bella Ramsey, Gabriel Luna",
        "series",
        "series",
        "",
        "",
        "https://www.youtube.com/watch?v=uLtkt8BonwM"
      ]);
      const row = await dbGetAsync("SELECT id FROM movies WHERE title = ?", ["The Last of Us"]);
      movieId = row?.id;
      if (!IS_POSTGRES) saveDb();
    }

    if (movieId) {
      const season1Episodes = [
        {
          number: 1,
          title: "Quando Estiver Perdido na Escuridão",
          duration: "1h 21min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F01-temporada%2F01%2Fstream.m3u8&slug=the-last-of-us&temporada=1&numero_episodio=1&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Vinte anos após o surto do fungo Cordyceps devastar o planeta, Joel recebe a missão de escoltar a jovem Ellie para fora de uma zona de quarentena em Boston."
        },
        {
          number: 2,
          title: "Infectados",
          duration: "53 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F01-temporada%2F02%2Fstream.m3u8&slug=the-last-of-us&temporada=1&numero_episodio=2&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Joel, Tess e Ellie exploram as ruínas de uma cidade tomada pelo fungo enquanto tentam entender o real valor da menina para os Vagalumes."
        },
        {
          number: 3,
          title: "Por Muito, Muito Tempo",
          duration: "1h 15min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F01-temporada%2F03%2Fstream.m3u8&slug=the-last-of-us&temporada=1&numero_episodio=3&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "O episódio foca na história de sobrevivência de Bill e Frank, mostrando uma conexão improvável que floresceu durante o apocalipse."
        },
        {
          number: 4,
          title: "Por Favor, Segure a Minha Mão",
          duration: "46 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F01-temporada%2F04%2Fstream.m3u8&slug=the-last-of-us&temporada=1&numero_episodio=4&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Joel e Ellie enfrentam perigos ao passarem por Kansas City, onde encontram um grupo violento de rebeldes sobreviventes."
        },
        {
          number: 5,
          title: "Resistir e Sobreviver",
          duration: "59 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F01-temporada%2F05%2Fstream.m3u8&slug=the-last-of-us&temporada=1&numero_episodio=5&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "A dupla tenta escapar dos rebeldes locais enquanto cruza o caminho de outros sobreviventes, levando a consequências trágicas e marcantes."
        },
        {
          number: 6,
          title: "Parentesco",
          duration: "59 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F01-temporada%2F06%2Fstream.m3u8&slug=the-last-of-us&temporada=1&numero_episodio=6&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Joel e Ellie seguem em direção a um território perigoso em busca de Tommy, o irmão de Joel, ignorando avisos sobre os riscos da região."
        },
        {
          number: 7,
          title: "O Que Deixamos Para Trás",
          duration: "56 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F01-temporada%2F07%2Fstream.m3u8&slug=the-last-of-us&temporada=1&numero_episodio=7&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Enquanto Joel luta pela vida após ser gravemente ferido, Ellie relembra eventos dolorosos do seu passado militar ao lado de sua melhor amiga Riley."
        },
        {
          number: 8,
          title: "Quando Mais Precisamos",
          duration: "51 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F01-temporada%2F08%2Fstream.m3u8&slug=the-last-of-us&temporada=1&numero_episodio=8&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Ellie cruza o caminho de um grupo de sobreviventes religioso e canibal liderado pelo sinistro David, precisando lutar para proteger a si mesma e a Joel."
        },
        {
          number: 9,
          title: "Procure a Luz",
          duration: "43 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F01-temporada%2F09%2Fstream.m3u8&slug=the-last-of-us&temporada=1&numero_episodio=9&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Joel e Ellie finalmente chegam ao hospital dos Vagalumes, forçando Joel a tomar uma decisão extrema para salvar a vida de Ellie."
        }
      ];

      for (const ep of season1Episodes) {
        const existing = await dbGetAsync("SELECT id FROM episodes WHERE movie_id = ? AND season = 1 AND number = ?", [movieId, ep.number]);
        if (!existing) {
          await dbRunAsync(`
            INSERT INTO episodes (movie_id, season, number, title, duration, videoUrl, "desc", subtitlesUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [movieId, 1, ep.number, ep.title, ep.duration, ep.videoUrl, ep.desc, ""]);
        }
      }

      const season2Episodes = [
        {
          number: 1,
          title: "Dias Futuros",
          duration: "59 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F02-temporada%2F01%2Fstream.m3u8&slug=the-last-of-us&temporada=2&numero_episodio=1&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Joel e Ellie tentam se adaptar à vida estável em Jackson, mas o passado de Joel começa a retornar na forma de novas ameaças, abalando a confiança entre eles."
        },
        {
          number: 2,
          title: "Através do Vale",
          duration: "57 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F02-temporada%2F02%2Fstream.m3u8&slug=the-last-of-us&temporada=2&numero_episodio=2&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "A comunidade de Jackson se depara com uma patrulha perigosa, enquanto Abby e seu grupo se aproximam da cidade em busca de respostas."
        },
        {
          number: 3,
          title: "O Caminho",
          duration: "57 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F02-temporada%2F03%2Fstream.m3u8&slug=the-last-of-us&temporada=2&numero_episodio=3&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Ellie toma uma decisão crucial que altera o rumo de sua vida em Jackson, enquanto um grupo misterioso foge da devastação em Seattle."
        },
        {
          number: 4,
          title: "Dia Um",
          duration: "53 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F02-temporada%2F04%2Fstream.m3u8&slug=the-last-of-us&temporada=2&numero_episodio=4&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Ellie chega a Seattle em busca de vingança e se vê em meio a um violento conflito territorial entre a Frente de Libertação de Washington (WLF) e os Serafitas."
        },
        {
          number: 5,
          title: "Sinta o Amor Dela",
          duration: "45 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F02-temporada%2F05%2Fstream.m3u8&slug=the-last-of-us&temporada=2&numero_episodio=5&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Ellie e Dina enfrentam os perigos ocultos de Seattle, enquanto segredos do passado revelam o preço das escolhas que fizeram."
        },
        {
          number: 6,
          title: "O Preço",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F02-temporada%2F06%2Fstream.m3u8&slug=the-last-of-us&temporada=2&numero_episodio=6&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Confrontando novos dilemas morais, Ellie é levada ao limite psicológico ao descobrir pistas sobre o paradeiro de Abby."
        },
        {
          number: 7,
          title: "Convergência",
          duration: "50 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-last-of-us%2F02-temporada%2F07%2Fstream.m3u8&slug=the-last-of-us&temporada=2&numero_episodio=7&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "O confronto final de Seattle coloca Ellie frente a frente com as consequências devastadoras de sua própria busca por vingança."
        }
      ];

      for (const ep of season2Episodes) {
        const existing = await dbGetAsync("SELECT id FROM episodes WHERE movie_id = ? AND season = 2 AND number = ?", [movieId, ep.number]);
        if (!existing) {
          await dbRunAsync(`
            INSERT INTO episodes (movie_id, season, number, title, duration, videoUrl, "desc", subtitlesUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [movieId, 2, ep.number, ep.title, ep.duration, ep.videoUrl, ep.desc, ""]);
        }
      }

      if (!IS_POSTGRES) saveDb();
      console.log("[DB SEED] ✅ Temporada 1 e 2 de The Last of Us semeadas com sucesso.");
    }
  } catch (err) {
    console.error("[DB SEED ERROR] Erro ao semear Temporadas de The Last of Us:", err);
  }

  // --- SEED SEASONS FOR THE BOYS AUTOMATICALLY ---
  try {
    const movie = await dbGetAsync("SELECT id FROM movies WHERE title = ?", ["The Boys"]);
    let movieId;
    if (movie) {
      movieId = movie.id;
      await dbRunAsync("UPDATE movies SET duration = '5 Temporadas' WHERE id = ?", [movieId]);
    } else {
      await dbRunAsync(`
        INSERT INTO movies (title, year, duration, rating, genre, "desc", poster, backdrop, director, "cast", category, type, videoUrl, subtitlesUrl, trailerUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        "The Boys",
        2019,
        "5 Temporadas",
        8.5,
        "Ação / Drama / Ficção Científica / Sátira",
        "Em um mundo onde super-heróis são gerenciados por uma corporação gananciosa e abusam de seus poderes, um grupo de vigilantes busca expor a verdade sobre eles.",
        "https://i.postimg.cc/vHnSwtMj/image.png",
        "https://i.postimg.cc/xC7gWcZD/image.png",
        "Eric Kripke",
        "Karl Urban, Jack Quaid, Antony Starr, Erin Moriarty",
        "series",
        "series",
        "",
        "",
        "https://www.youtube.com/watch?v=tcrNsIaQkb4"
      ]);
      const row = await dbGetAsync("SELECT id FROM movies WHERE title = ?", ["The Boys"]);
      movieId = row?.id;
      if (!IS_POSTGRES) saveDb();
    }

    if (movieId) {
      const season1Episodes = [
        {
          number: 1,
          title: "O Nome do Jogo",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F01-temporada%2F01%2Fstream.m3u8&slug=the-boys&temporada=1&numero_episodio=1&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "A vida de Hughie muda drasticamente quando sua namorada é morta por um super-herói (A-Train). Ele é recrutado por Billy Bruto para se vingar."
        },
        {
          number: 2,
          title: "Cherry",
          duration: "55 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F01-temporada%2F02%2Fstream.m3u8&slug=the-boys&temporada=1&numero_episodio=2&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Os Rapazes (The Boys) tentam capturar um super-herói, enquanto Luz-Estrela (Starlight) tenta lidar com sua nova realidade nos Sete."
        },
        {
          number: 3,
          title: "Na Fissura",
          duration: "57 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F01-temporada%2F03%2Fstream.m3u8&slug=the-boys&temporada=1&numero_episodio=3&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "O grupo investiga as conexões entre a Vought e o Composto V, enquanto a tensão aumenta entre os membros dos Sete."
        },
        {
          number: 4,
          title: "A Fêmea da Espécie",
          duration: "55 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F01-temporada%2F04%2Fstream.m3u8&slug=the-boys&temporada=1&numero_episodio=4&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Os Boys encontram uma mulher misteriosa com superpoderes (a Fêmea), que estava sendo mantida em cativeiro."
        },
        {
          number: 5,
          title: "Bom para a Alma",
          duration: "56 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F01-temporada%2F05%2Fstream.m3u8&slug=the-boys&temporada=1&numero_episodio=5&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Durante um evento religioso, Starlight descobre mais sobre as manipulações da Vought, enquanto o passado de Billy Bruto é explorado."
        },
        {
          number: 6,
          title: "Os Inocentes",
          duration: "57 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F01-temporada%2F06%2Fstream.m3u8&slug=the-boys&temporada=1&numero_episodio=6&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "A equipe tenta descobrir segredos obscuros escondidos pela Vought, enquanto Hughie e Starlight se aproximam cada vez mais."
        },
        {
          number: 7,
          title: "A Sociedade da Autopreservação",
          duration: "57 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F01-temporada%2F07%2Fstream.m3u8&slug=the-boys&temporada=1&numero_episodio=7&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "O cerco contra os Sete aperta e os conflitos internos na Vought começam a vir à tona."
        },
        {
          number: 8,
          title: "Você me Encontrou",
          duration: "1h 02min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F01-temporada%2F08%2Fstream.m3u8&slug=the-boys&temporada=1&numero_episodio=8&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "O confronto final da temporada, revelando verdades impactantes sobre o Capitão Pátria e o destino de Becca Bruto."
        }
      ];

      for (const ep of season1Episodes) {
        const existing = await dbGetAsync("SELECT id FROM episodes WHERE movie_id = ? AND season = 1 AND number = ?", [movieId, ep.number]);
        if (!existing) {
          await dbRunAsync(`
            INSERT INTO episodes (movie_id, season, number, title, duration, videoUrl, "desc", subtitlesUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [movieId, 1, ep.number, ep.title, ep.duration, ep.videoUrl, ep.desc, ""]);
        }
      }

      const season2Episodes = [
        {
          number: 1,
          title: "O Grande Momento",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F02-temporada%2F01%2Fstream.m3u8&slug=the-boys&temporada=2&numero_episodio=1&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Bruto está foragido e os Rapazes tentam se ajustar a um novo normal enquanto são procurados pela polícia e vigiados pela Vought."
        },
        {
          number: 2,
          title: "Preparação e Planejamento Adequados",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F02-temporada%2F02%2Fstream.m3u8&slug=the-boys&temporada=2&numero_episodio=2&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Bruto retorna para liderar os Rapazes na busca por Becca, enquanto o Capitão Pátria tenta estreitar laços com o filho."
        },
        {
          number: 3,
          title: "Lá no Alto com as Espadas de Mil Homens",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F02-temporada%2F03%2Fstream.m3u8&slug=the-boys&temporada=2&numero_episodio=3&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Os Rapazes tentam contrabandear o superterrorista Kenji para as autoridades, mas os Sete e Tempesta iniciam uma caçada implacável."
        },
        {
          number: 4,
          title: "Sem Igual no Mundo",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F02-temporada%2F04%2Fstream.m3u8&slug=the-boys&temporada=2&numero_episodio=4&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Bruto planeja o resgate de Becca, enquanto Hughie, Leitinho e Annie viajam em busca de pistas sobre a misteriosa super-heroína Liberdade."
        },
        {
          number: 5,
          title: "Temos que Ir Agora",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F02-temporada%2F05%2Fstream.m3u8&slug=the-boys&temporada=2&numero_episodio=5&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "O Capitão Pátria se isola após ver sua popularidade despencar, enquanto Bruto e os Rapazes enfrentam problemas internos na equipe."
        },
        {
          number: 6,
          title: "As Portas Sangrentas",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F02-temporada%2F06%2Fstream.m3u8&slug=the-boys&temporada=2&numero_episodio=6&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Os Rapazes infiltram-se no Hospital Sage Grove, uma instituição secreta da Vought, onde descobrem segredos perturbadores sobre o Composto V."
        },
        {
          number: 7,
          title: "Carniceiro, Padeiro, Fabricante de Velas",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F02-temporada%2F07%2Fstream.m3u8&slug=the-boys&temporada=2&numero_episodio=7&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Bruto tenta obter a ajuda de seu antigo mentor da CIA para depor contra a Vought em uma audiência pública no Congresso."
        },
        {
          number: 8,
          title: "O que eu Sei",
          duration: "1h 06min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F02-temporada%2F08%2Fstream.m3u8&slug=the-boys&temporada=2&numero_episodio=8&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Becca fuge da Vought em busca da ajuda de Bruto para salvar seu filho, culminando em um confronto trágico e brutal contra o Capitão Pátria."
        }
      ];

      for (const ep of season2Episodes) {
        const existing = await dbGetAsync("SELECT id FROM episodes WHERE movie_id = ? AND season = 2 AND number = ?", [movieId, ep.number]);
        if (!existing) {
          await dbRunAsync(`
            INSERT INTO episodes (movie_id, season, number, title, duration, videoUrl, "desc", subtitlesUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [movieId, 2, ep.number, ep.title, ep.duration, ep.videoUrl, ep.desc, ""]);
        }
      }

      const season3Episodes = [
        {
          number: 1,
          title: "Revanche",
          duration: "1h 03min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F03-temporada%2F01%2Fstream.m3u8&slug=the-boys&temporada=3&numero_episodio=1&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Após um ano de calmaria, Billy Bruto trabalha para o governo sob a supervisão de Hughie. Mas a paz dura pouco quando eles descobrem uma pista sobre a misteriosa arma que matou o Soldier Boy."
        },
        {
          number: 2,
          title: "O Único Homem No Céu",
          duration: "1h 01min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F03-temporada%2F02%2Fstream.m3u8&slug=the-boys&temporada=3&numero_episodio=2&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "A estabilidade mental do Capitão Pátria é questionada enquanto Billy Bruto começa a investigar a lenda do Soldier Boy e usa o Composto V temporário pela primeira vez."
        },
        {
          number: 3,
          title: "Costa Bárbara",
          duration: "1h 02min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F03-temporada%2F03%2Fstream.m3u8&slug=the-boys&temporada=3&numero_episodio=3&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "A equipe dos Boys viaja para obter informações sobre a equipe Revanche e o Soldier Boy, revivendo flashbacks de uma missão desastrosa na Nicarágua em 1984."
        },
        {
          number: 4,
          title: "O Glorioso Plano de Cinco Anos",
          duration: "1h 04min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F03-temporada%2F04%2Fstream.m3u8&slug=the-boys&temporada=3&numero_episodio=4&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Os Boys viajam para a Rússia em busca da arma secreta que supostamente matou o Soldier Boy, mas acabam fazendo uma descoberta inesperada e perigosa."
        },
        {
          number: 5,
          title: "A Última Oportunidade para Olhar Este Mundo de Mentiras",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F03-temporada%2F05%2Fstream.m3u8&slug=the-boys&temporada=3&numero_episodio=5&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Hughie e Bruto lidam com os efeitos colaterais do Composto V temporário, enquanto o Soldier Boy solto em solo americano busca vingança contra seus antigos companheiros."
        },
        {
          number: 6,
          title: "Supersuruba (Herogasm)",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F03-temporada%2F06%2Fstream.m3u8&slug=the-boys&temporada=3&numero_episodio=6&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Billy Bruto, Hughie e Soldier Boy localizam os gêmeos TNT no evento anual Herogasm, resultando em um confronto massivo e caótico contra o Capitão Pátria."
        },
        {
          number: 7,
          title: "Uma Vela para Iluminar Seu Caminho até a Cama",
          duration: "59 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F03-temporada%2F07%2Fstream.m3u8&slug=the-boys&temporada=3&numero_episodio=7&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Revelações chocantes sobre o passado do Soldier Boy e do Capitão Pátria vêm à tona, enquanto Mind-Storm confronta Bruto com seus piores pesadelos."
        },
        {
          number: 8,
          title: "O Quente Deserto Instantâneo",
          duration: "1h 05min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F03-temporada%2F08%2Fstream.m3u8&slug=the-boys&temporada=3&numero_episodio=8&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "No confronto decisivo da temporada, os caminhos de Billy Bruto, Soldier Boy, Capitão Pátria e os Boys colidem na Vought Tower com consequências devastadoras."
        }
      ];

      for (const ep of season3Episodes) {
        const existing = await dbGetAsync("SELECT id FROM episodes WHERE movie_id = ? AND season = 3 AND number = ?", [movieId, ep.number]);
        if (!existing) {
          await dbRunAsync(`
            INSERT INTO episodes (movie_id, season, number, title, duration, videoUrl, "desc", subtitlesUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [movieId, 3, ep.number, ep.title, ep.duration, ep.videoUrl, ep.desc, ""]);
        }
      }

      const season4Episodes = [
        {
          number: 1,
          title: "Departamento de Truques Sujos",
          duration: "59 min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F04-temporada%2F01%2Fstream.m3u8&slug=the-boys&temporada=4&numero_episodio=1&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "A equipe tenta interferir nos planos políticos de Victoria Neuman enquanto o Capitão Pátria busca consolidar seu poder. Billy Bruto lida com sua saúde debilitada."
        },
        {
          number: 2,
          title: "A Vida Entre os Cépticos",
          duration: "1h 02min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F04-temporada%2F02%2Fstream.m3u8&slug=the-boys&temporada=4&numero_episodio=2&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Os Boys tentam rastrear um novo aliado enquanto a Vought inicia uma campanha de manipulação da opinião pública, e o Capitão Pátria introduz Mana Sábia nos Sete."
        },
        {
          number: 3,
          title: "Manteremos a Bandeira Vermelha Hasteada Aqui",
          duration: "1h 04min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F04-temporada%2F03%2Fstream.m3u8&slug=the-boys&temporada=4&numero_episodio=3&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Capitão Pátria tenta moldar Ryan à sua imagem, enquanto os Boys tentam resgatar a família de um aliado político em uma missão de alto risco."
        },
        {
          number: 4,
          title: "A Sabedoria das Eras",
          duration: "1h 03min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F04-temporada%2F04%2Fstream.m3u8&slug=the-boys&temporada=4&numero_episodio=4&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "O Capitão Pátria retorna ao laboratório secreto de sua infância para confrontar seus antigos torturadores e superar seus traumas mais profundos."
        },
        {
          number: 5,
          title: "Cuidado com o Jaguadarte, Meu Filho",
          duration: "1h 01min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F04-temporada%2F05%2Fstream.m3u8&slug=the-boys&temporada=4&numero_episodio=5&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "O Composto V administrado ao pai de Hughie causa uma tragédia no hospital, enquanto os Boys buscam um vírus capaz de conter ou matar super-heróis."
        },
        {
          number: 6,
          title: "Negócios Sujos",
          duration: "1h 02min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F04-temporada%2F06%2Fstream.m3u8&slug=the-boys&temporada=4&numero_episodio=6&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Leitinho, Annie e Kimiko se infiltram em uma festa na mansão de Tek Knight para expor os segredos de seus planos de prisões privadas."
        },
        {
          number: 7,
          title: "O Infiltrado",
          duration: "1h 03min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F04-temporada%2F07%2Fstream.m3u8&slug=the-boys&temporada=4&numero_episodio=7&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Trem-Bala corre perigo extremo após ser exposto como o informante dos Boys, forçando-o a tomar uma decisão drástica para salvar sua própria vida."
        },
        {
          number: 8,
          title: "Final da Temporada 4",
          duration: "1h 08min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F04-temporada%2F08%2Fstream.m3u8&slug=the-boys&temporada=4&numero_episodio=8&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "O plano de assassinato político atinge seu clímax em uma corrida desesperada contra o tempo. O destino dos Boys e do país é selado após a intervenção da Vought."
        }
      ];

      for (const ep of season4Episodes) {
        const existing = await dbGetAsync("SELECT id FROM episodes WHERE movie_id = ? AND season = 4 AND number = ?", [movieId, ep.number]);
        if (!existing) {
          await dbRunAsync(`
            INSERT INTO episodes (movie_id, season, number, title, duration, videoUrl, "desc", subtitlesUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [movieId, 4, ep.number, ep.title, ep.duration, ep.videoUrl, ep.desc, ""]);
        }
      }

      const season5Episodes = [
        {
          number: 1,
          title: "Episódio 1",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F05-temporada%2F01%2Fstream.m3u8&slug=the-boys&temporada=5&numero_episodio=1&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Episódio 1 da quinta temporada de The Boys. Em breve."
        },
        {
          number: 2,
          title: "Episódio 2",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F05-temporada%2F02%2Fstream.m3u8&slug=the-boys&temporada=5&numero_episodio=2&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Episódio 2 da quinta temporada de The Boys. Em breve."
        },
        {
          number: 3,
          title: "Episódio 3",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F05-temporada%2F03%2Fstream.m3u8&slug=the-boys&temporada=5&numero_episodio=3&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Episódio 3 da quinta temporada de The Boys. Em breve."
        },
        {
          number: 4,
          title: "Episódio 4",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F05-temporada%2F04%2Fstream.m3u8&slug=the-boys&temporada=5&numero_episodio=4&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Episódio 4 da quinta temporada de The Boys. Em breve."
        },
        {
          number: 5,
          title: "Episódio 5",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F05-temporada%2F05%2Fstream.m3u8&slug=the-boys&temporada=5&numero_episodio=5&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Episódio 5 da quinta temporada de The Boys. Em breve."
        },
        {
          number: 6,
          title: "Episódio 6",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F05-temporada%2F06%2Fstream.m3u8&slug=the-boys&temporada=5&numero_episodio=6&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Episódio 6 da quinta temporada de The Boys. Em breve."
        },
        {
          number: 7,
          title: "Episódio 7",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F05-temporada%2F07%2Fstream.m3u8&slug=the-boys&temporada=5&numero_episodio=7&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Episódio 7 da quinta temporada de The Boys. Em breve."
        },
        {
          number: 8,
          title: "Episódio 8",
          duration: "1h 00min",
          videoUrl: "https://www.axplay.shop/goplayer.php?d=%2FT%2Fthe-boys%2F05-temporada%2F08%2Fstream.m3u8&slug=the-boys&temporada=5&numero_episodio=8&tipo=series&primaryURL=https%3A%2F%2Fondemand.telabrasil.shop&fallbackURL=https%3A%2F%2Fforks-series.telabrasil.shop&precacheEndpoint=https%3A%2F%2Fping-us-series.telabrasil.shop%2Fprecache",
          desc: "Episódio 8 da quinta temporada de The Boys. Em breve."
        }
      ];

      for (const ep of season5Episodes) {
        const existing = await dbGetAsync("SELECT id FROM episodes WHERE movie_id = ? AND season = 5 AND number = ?", [movieId, ep.number]);
        if (!existing) {
          await dbRunAsync(`
            INSERT INTO episodes (movie_id, season, number, title, duration, videoUrl, "desc", subtitlesUrl)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [movieId, 5, ep.number, ep.title, ep.duration, ep.videoUrl, ep.desc, ""]);
        }
      }

      if (!IS_POSTGRES) saveDb();
      console.log("[DB SEED] ✅ Temporadas 1 a 5 de The Boys semeadas com sucesso.");
    }
  } catch (err) {
    console.error("[DB SEED ERROR] Erro ao semear Temporadas de The Boys:", err);
  }

  // --- GARANTIR QUE CREED: III SEJA ADICIONADO SE ESTIVER AUSENTE ---
  try {
    const existingCreed3 = await dbGetAsync("SELECT id FROM movies WHERE title = ?", ["Creed: III"]);
    if (!existingCreed3) {
      console.log("  📦 Adicionando Creed: III ao catálogo...");
      await dbRunAsync(`
        INSERT INTO movies (title, year, duration, rating, genre, "desc", poster, backdrop, director, "cast", category, type, videoUrl, subtitlesUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        "Creed: III",
        2023,
        "1h 56min",
        7.3,
        "Ação / Drama",
        "Depois de dominar o mundo do boxe, Adonis Creed tem prosperado tanto em sua carreira quanto em sua vida familiar. Quando um amigo de infância e ex-prodígio do boxe, Damian, ressurge após cumprir uma longa pena na prisão, ele está ansioso para provar que merece sua chance no ringue.",
        "https://image.tmdb.org/t/p/w500/cvsXj3DYs52LifH8iFS4t6VvU2n.jpg",
        "https://image.tmdb.org/t/p/w1280/5i6SJUzN2eeU25Z2sLqN5H6s99e.jpg",
        "Michael B. Jordan",
        "Michael B. Jordan, Tessa Thompson, Jonathan Majors",
        "new",
        "movie",
        "https://pub-288bd4ecd7e6445fa9db9fb2c7c0b087.r2.dev/Dupla.Perigosa.2026.WEB-DL.1080p.x264.DUAL.5.1-SF.mp4",
        null,
        DEFAULT_TRAILER_URLS['Creed: III']
      ]);
      if (!IS_POSTGRES) saveDb();
      console.log("  ✅ Creed: III adicionado com sucesso!");
    }
  } catch (err) {
    console.error("[DB SEED ERROR] Erro ao garantir Creed: III:", err);
  }

  // --- GARANTIR QUE AVATAR: FOGO E CINZAS SEJA ADICIONADO SE ESTIVER AUSENTE ---
  try {
    const existingAvatar3 = await dbGetAsync("SELECT id FROM movies WHERE title = ?", ["Avatar: Fogo e Cinzas"]);
    if (!existingAvatar3) {
      console.log("  📦 Adicionando Avatar: Fogo e Cinzas ao catálogo...");
      await dbRunAsync(`
        INSERT INTO movies (title, year, duration, rating, genre, "desc", poster, backdrop, director, "cast", category, type, videoUrl, subtitlesUrl, trailerUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        "Avatar: Fogo e Cinzas",
        2025,
        "3h 17min",
        8.2,
        "Ação / Aventura / Ficção Científica",
        "Jake Sully, Neytiri e a família Sully navegam por mais aventuras em Pandora, enfrentando um novo perigo: o Povo das Cinzas, uma agressiva tribo Na'vi que vive da fúria e do fogo.",
        "https://i.postimg.cc/QCJDtJDy/image.png",
        "https://i.postimg.cc/rFqcH3Cw/image.png",
        "James Cameron",
        "Sam Worthington, Zoe Saldaña, Sigourney Weaver, Kate Winslet",
        "new",
        "movie",
        "https://ir.embedplay.info/e/9BNuyWbcuCR8GRxbl0j8CWqUikhTDTvJaydMW7SMYw7tLKkCMR_28WgZw2yyyvin6v6Fv5ZuilNQgVOx72oL7roCW-T38cfCZ09GVfApI1cCmaN1pX906z7todgTtUWhypXyI48yrMyZRLP3KL92RKaEwThbC3dzT0BfiEJrXAYwiR8N7q7SbWJmiG_E",
        null,
        "https://www.youtube.com/watch?v=F7P2X4223fI"
      ]);
      if (!IS_POSTGRES) saveDb();
      console.log("  ✅ Avatar: Fogo e Cinzas adicionado com sucesso!");
    }
  } catch (err) {
    console.error("[DB SEED ERROR] Erro ao garantir Avatar: Fogo e Cinzas:", err);
  }

  // --- GARANTIR QUE INTERESTELAR SEJA ADICIONADO SE ESTIVER AUSENTE ---
  try {
    const existingInterstellar = await dbGetAsync("SELECT id FROM movies WHERE title = ?", ["Interestelar"]);
    if (!existingInterstellar) {
      console.log("  📦 Adicionando Interestelar ao catálogo...");
      await dbRunAsync(`
        INSERT INTO movies (title, year, duration, rating, genre, "desc", poster, backdrop, director, "cast", category, type, videoUrl, subtitlesUrl, trailerUrl)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        "Interestelar",
        2014,
        "2h 49min",
        8.7,
        "Ação / Ficção Científica / Drama",
        "As reservas naturais da Terra estão chegando ao fim e um grupo de astronautas recebe a missão de verificar possíveis planetas para receberem a população mundial, possibilitando a continuação da espécie humana. Cooper é chamado para liderar o grupo e aceita a missão sabendo que pode nunca mais ver os filhos.",
        "https://image.tmdb.org/t/p/w500/gEU2QpE6E5y3Qp2v2L9g4Q7Y.jpg",
        "https://image.tmdb.org/t/p/w1280/rAiYTfPXjtEacIBB02zWfP15YfM.jpg",
        "Christopher Nolan",
        "Matthew McConaughey, Anne Hathaway, Jessica Chastain",
        "new",
        "movie",
        "https://beam-ru.torrin.app/ba448d2ed8e70a92ce95c8599635317acba65eaa/file_0/Interestelar.2014.1080p.BluRay.5.1.x264.DUAL-SF.mkv?expires=1783042222&sig=10f478e3adaec8ed84135fcaf5646a747d9ebe5a1f2e4daee62e66d03b57d4d7",
        null,
        "https://www.youtube.com/watch?v=zSWdZVtXT7E"
      ]);
      if (!IS_POSTGRES) saveDb();
      console.log("  ✅ Interestelar adicionado com sucesso!");
    }
  } catch (err) {
    console.error("[DB SEED ERROR] Erro ao garantir Interestelar:", err);
  }

  try {
    for (const [title, trailerUrl] of Object.entries(DEFAULT_TRAILER_URLS)) {
      await dbRunAsync(
        'UPDATE movies SET trailerUrl = ? WHERE title = ? AND (trailerUrl IS NULL OR trailerUrl = \'\')',
        [trailerUrl, title]
      );
    }
    if (!IS_POSTGRES) saveDb();
  } catch (err) {
    console.error('[DB SEED ERROR] Erro ao preencher trailers:', err);
  }

  console.log('  ✅ Banco de dados pronto e iniciado');
}

const deasync = require('deasync');

// Tradutor de queries de SQLite (?) para PostgreSQL ($1, $2, $3...)
function translateQuery(sql) {
  if (!IS_POSTGRES) {
    return sql;
  }
  
  // Tradução de INSERT OR REPLACE específico para payment_logs no PostgreSQL
  let translatedSql = sql;
  if (translatedSql.toLowerCase().includes('insert or replace into payment_logs')) {
    translatedSql = translatedSql.replace(/insert or replace/gi, 'INSERT');
    if (translatedSql.includes('created_at') || translatedSql.includes('paid_at')) {
      translatedSql += ` ON CONFLICT (txid) DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        plan_id = EXCLUDED.plan_id,
        amount = EXCLUDED.amount,
        status = EXCLUDED.status,
        created_at = EXCLUDED.created_at,
        paid_at = EXCLUDED.paid_at`;
    } else {
      translatedSql += ` ON CONFLICT (txid) DO UPDATE SET 
        user_id = EXCLUDED.user_id,
        plan_id = EXCLUDED.plan_id,
        amount = EXCLUDED.amount,
        status = EXCLUDED.status`;
    }
  }

  // PostgreSQL: substituir placeholders ? por $1, $2, $3...
  let paramCount = 0;
  translatedSql = translatedSql.replace(/\?/g, () => {
    paramCount++;
    return `$${paramCount}`;
  });

  // Tradução de funções e termos específicos
  translatedSql = translatedSql.replace(/datetime\('now'\)/gi, 'CURRENT_TIMESTAMP');
  translatedSql = translatedSql.replace(/like/gi, 'ILIKE'); // LIKE case-insensitive no Postgres é ILIKE
  
  // Escapar palavras reservadas do PostgreSQL que podem estar sem aspas em queries do SQLite
  // Substitui cast e desc por "cast" e "desc" quando usados como colunas isoladas
  translatedSql = translatedSql.replace(/\bcast\b(?!")/g, '"cast"');
  translatedSql = translatedSql.replace(/\bdesc\b(?!")(?!(\s+asc|\s+desc|\s*,|\s*$))/gi, '"desc"'); // Não escapa o DESC do ORDER BY DESC
  
  return translatedSql;
}

// Helper para rodar query de migração sincronizada
async function dbRunSync(sql) {
  const translated = translateQuery(sql);
  if (IS_POSTGRES) {
    await pgPool.query(translated);
  } else {
    db.run(translated);
    saveDb();
  }
}

function saveDb() {
  if (!IS_POSTGRES && db) {
    fs.writeFileSync(DB_PATH, Buffer.from(db.export()));
  }
}

// ---- Helpers de Banco 100% Assíncronos para Inicialização ----
async function dbGetAsync(sql, params = []) {
  const translated = translateQuery(sql);
  if (IS_POSTGRES) {
    const res = await pgPool.query(translated, params);
    return res.rows[0] || null;
  } else {
    try {
      const stmt = db.prepare(translated);
      stmt.bind(params);
      const hasRow = stmt.step();
      const result = hasRow ? stmt.getAsObject() : null;
      stmt.free();
      return result;
    } catch (err) {
      console.error('[DB SQLITE GET ASYNC ERROR]', err);
      return null;
    }
  }
}

async function dbRunAsync(sql, params = []) {
  const translated = translateQuery(sql);
  if (IS_POSTGRES) {
    const res = await pgPool.query(translated, params);
    return res.rows[0]?.id || null;
  } else {
    try {
      db.run(translated, params);
      saveDb();
      return null;
    } catch (err) {
      console.error('[DB SQLITE RUN ASYNC ERROR]', err);
      return null;
    }
  }
}

// ---- DB Helpers Síncronos compatíveis com deasync para PostgreSQL ----

function dbGet(sql, params = []) {
  const translated = translateQuery(sql);
  
  if (IS_POSTGRES) {
    let done = false;
    let result = null;
    let error = null;

    pgPool.query(translated, params, (err, res) => {
      if (err) error = err;
      else result = res.rows[0] || null;
      done = true;
    });

    // Forçar o event loop a rodar até a query PostgreSQL assíncrona terminar
    while (!done) {
      deasync.runLoopOnce();
    }

    if (error) {
      console.error('[DB PG GET ERROR]', error.message, 'Query:', translated);
      return null;
    }
    return result;
  } else {
    try {
      const stmt = db.prepare(translated);
      stmt.bind(params);
      const row = stmt.step() ? stmt.getAsObject() : null;
      stmt.free();
      return row;
    } catch (err) {
      console.error('[DB SQLITE GET ERROR]', err);
      return null;
    }
  }
}

function dbAll(sql, params = []) {
  const translated = translateQuery(sql);

  if (IS_POSTGRES) {
    let done = false;
    let result = [];
    let error = null;

    pgPool.query(translated, params, (err, res) => {
      if (err) error = err;
      else result = res.rows || [];
      done = true;
    });

    while (!done) {
      deasync.runLoopOnce();
    }

    if (error) {
      console.error('[DB PG ALL ERROR]', error.message, 'Query:', translated);
      return [];
    }
    return result;
  } else {
    try {
      const stmt = db.prepare(translated);
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) rows.push(stmt.getAsObject());
      stmt.free();
      return rows;
    } catch (err) {
      console.error('[DB SQLITE ALL ERROR]', err);
      return [];
    }
  }
}

function dbRun(sql, params = []) {
  const translated = translateQuery(sql);

  if (IS_POSTGRES) {
    let done = false;
    let lastId = null;
    let error = null;

    // Se for um insert, adicionar RETURNING id para sabermos o last_insert_rowid
    let finalSql = translated;
    if (finalSql.trim().toUpperCase().startsWith('INSERT ')) {
      finalSql += ' RETURNING id';
    }

    pgPool.query(finalSql, params, (err, res) => {
      if (err) error = err;
      else lastId = res.rows[0]?.id || null;
      done = true;
    });

    while (!done) {
      deasync.runLoopOnce();
    }

    if (error) {
      console.error('[DB PG RUN ERROR]', error.message, 'Query:', finalSql);
      return null;
    }
    return lastId;
  } else {
    try {
      db.run(translated, params);
      const res = db.exec('SELECT last_insert_rowid() as id');
      const lastId = res[0]?.values[0][0] ?? null;
      saveDb();
      return lastId;
    } catch (err) {
      console.error('[DB SQLITE RUN ERROR]', err);
      return null;
    }
  }
}

// Generate a 6-digit OTP
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// =============================================
//  MIDDLEWARE
// =============================================
// Necessário para detectar https:// corretamente atrás do proxy do Render
app.set('trust proxy', 1);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ 
  limit: '15mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
})); // Aumentar limite para aceitar imagens em base64
app.use(express.urlencoded({ extended: false, limit: '15mb' }));

// Criar pasta de uploads no diretório persistente se disponível, ou no local
const uploadsDir = PERSISTENT_DIR ? path.join(PERSISTENT_DIR, 'uploads') : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const avatarsDir = path.join(uploadsDir, 'avatars');
if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir, { recursive: true });
}

const subtitlesDir = path.join(__dirname, 'legendas');
if (!fs.existsSync(subtitlesDir)) {
  fs.mkdirSync(subtitlesDir);
}

const publicRoot = path.resolve(__dirname);
const staticRouteFiles = {
  '/': 'index.html',
  '/login': 'login.html',
  '/login.html': 'login.html',
  '/index.html': 'index.html',
  '/profiles.html': 'profiles.html',
  '/gerenciar-perfis': 'profiles.html',
  '/auth-callback': 'auth-callback.html',
  '/auth-callback.html': 'auth-callback.html',
  '/conta': 'account-profile.html',
  '/assinatura': 'account-profile.html',
  '/cobranca': 'account-profile.html',
  '/dispositivos': 'account-profile.html'
};

const staticContentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.vtt': 'text/vtt; charset=utf-8',
  '.srt': 'text/plain; charset=utf-8'
};

const blockedStaticFiles = new Set([
  'server.js',
  'goatcine.db',
  'package.json',
  'package-lock.json',
  '.env'
]);

function resolvePublicFile(reqPath) {
  const cleanPath = decodeURIComponent(reqPath.split('?')[0]);
  const routeFile = staticRouteFiles[cleanPath];
  const relativePath = routeFile || cleanPath.replace(/^\/+/, '');
  if (!relativePath || blockedStaticFiles.has(relativePath)) return null;

  const ext = path.extname(relativePath).toLowerCase();
  if (!staticContentTypes[ext]) return null;

  const absolutePath = path.resolve(publicRoot, relativePath);
  if (!absolutePath.startsWith(publicRoot + path.sep) && absolutePath !== publicRoot) return null;
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) return null;
  return absolutePath;
}

function sendOptimizedStatic(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (req.path.startsWith('/api/') || req.path.startsWith('/uploads/')) return next();
  const requestedFile = decodeURIComponent(req.path.split('?')[0]).replace(/^\/+/, '');
  if (blockedStaticFiles.has(requestedFile)) return res.sendStatus(404);

  const filePath = resolvePublicFile(req.path);
  if (!filePath) return next();

  try {
    const ext = path.extname(filePath).toLowerCase();
    const contentType = staticContentTypes[ext] || 'application/octet-stream';
    const body = fs.readFileSync(filePath);
    const acceptsGzip = /\bgzip\b/i.test(req.headers['accept-encoding'] || '');
    const shouldCompress = acceptsGzip && ['.html', '.css', '.js', '.json', '.svg', '.vtt', '.srt'].includes(ext);
    const output = shouldCompress ? zlib.gzipSync(body, { level: 6 }) : body;

    res.setHeader('Content-Type', contentType);
    const noCacheExts = new Set(['.html', '.css', '.js']);
    res.setHeader('Cache-Control', noCacheExts.has(ext) ? 'no-cache' : 'public, max-age=3600');
    res.setHeader('Content-Length', output.length);
    res.setHeader('Vary', 'Accept-Encoding');
    if (shouldCompress) res.setHeader('Content-Encoding', 'gzip');
    if (req.method === 'HEAD') return res.end();
    return res.end(output);
  } catch (err) {
    console.error('[STATIC OPTIMIZED ERROR]', err);
    return next();
  }
}

// Servir a pasta raiz do projeto e a pasta de uploads persistente
app.use(sendOptimizedStatic);
app.use('/legendas', express.static(subtitlesDir, {
  setHeaders(res, filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.vtt') {
      res.setHeader('Content-Type', 'text/vtt; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
    } else if (ext === '.srt') {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));
app.use(express.static(path.join(__dirname)));
if (PERSISTENT_DIR) {
  app.use('/uploads', express.static(uploadsDir));
}

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

function generateAdminToken() {
  return jwt.sign(
    { role: 'admin', user: 'admin' },
    ADMIN_JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer '))
    return res.status(401).json({ error: 'Token administrativo não fornecido' });
  const token = authHeader.slice(7);
  try {
    req.admin = jwt.verify(token, ADMIN_JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token administrativo inválido ou expirado' });
  }
}

function safeUser(user) {
  if (!user) return null;
  const { password_hash, ...safe } = user;
  return safe;
}

function cleanupActiveUsers() {
  const now = Date.now();
  for (const [key, entry] of activeUsers.entries()) {
    if (!entry?.lastSeen || now - entry.lastSeen > ACTIVE_USER_TTL_MS) {
      activeUsers.delete(key);
    }
  }
}

function getActiveUsersSnapshot() {
  cleanupActiveUsers();
  const users = Array.from(activeUsers.values())
    .sort((a, b) => b.lastSeen - a.lastSeen)
    .map((entry) => ({
      userId: entry.userId,
      name: entry.name,
      email: entry.email,
      profileId: entry.profileId,
      profileName: entry.profileName,
      activity: entry.activity,
      path: entry.path,
      lastSeen: new Date(entry.lastSeen).toISOString()
    }));

  return {
    count: users.length,
    watching: users.filter((entry) => entry.activity === 'watching').length,
    browsing: users.filter((entry) => entry.activity !== 'watching').length,
    users
  };
}

// =============================================
//  ROUTES — EMAIL AUTH
// =============================================

/**
 * POST /api/auth/register
 * Cria a conta do usuário diretamente no banco de dados e gera o token de sessão.
 * Body: { name, email, password }
 * Response: { token, user }
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

    // Hash da senha
    const pass_hash = await bcrypt.hash(password, 12);

    // Inserir usuário diretamente no banco
    dbRun(
      `INSERT INTO users (name, email, password_hash, method) VALUES (?, ?, ?, 'email')`,
      [name.trim(), cleanEmail, pass_hash]
    );

    // Buscar usuário criado pelo e-mail e gerar token de sessão
    const user = dbGet('SELECT * FROM users WHERE email = ?', [cleanEmail]);
    const token = generateToken(user);

    // Salvar sessão
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias
    dbRun('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, token, expiresAt]);

    console.log(`[AUTH] ✅ Nova conta criada diretamente: ${cleanEmail}`);
    return res.status(201).json({ token, user: safeUser(user) });

  } catch (err) {
    console.error('[REGISTER ERROR]', err);
    return res.status(500).json({ error: 'Erro ao criar a sua conta.' });
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
      dbRun('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
      return res.status(400).json({ error: 'Código expirado. Faça o cadastro novamente.', expired: true });
    }

    // Muitas tentativas?
    if (record.attempts >= 5) {
      dbRun('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
      return res.status(400).json({ error: 'Muitas tentativas. Faça o cadastro novamente.', expired: true });
    }

    // Código errado?
    if (record.code !== String(code).trim()) {
      dbRun('UPDATE verification_codes SET attempts = attempts + 1 WHERE email = ?', [cleanEmail]);
      const remaining = 4 - record.attempts;
      return res.status(400).json({
        error: `Código incorreto. ${remaining} tentativa(s) restante(s).`,
        attempts_left: remaining
      });
    }

    // ✅ Código correto — criar usuário!
    dbRun('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);

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

    dbRun(
      'UPDATE verification_codes SET code = ?, attempts = 0, expires_at = ?, created_at = datetime(\'now\') WHERE email = ?',
      [newCode, expiresAt, cleanEmail]
    );

    if (isEmailConfigured()) {
      try {
        await sendVerificationEmail(cleanEmail, record.name, newCode);
        console.log(`[EMAIL] ✅ Código reenviado com sucesso para: ${cleanEmail}`);
        return res.json({ success: true });
      } catch (mailErr) {
        console.error(`[EMAIL ERROR] Falha no reenvio para ${cleanEmail}. Erro:`, mailErr.message);
        console.log(`[EMAIL] ⚠️ Fallback ativo no reenvio — Código: ${newCode}`);
        return res.json({ success: true, dev_code: newCode });
      }
    } else {
      console.log(`[EMAIL] ⚠️  Dev mode — Novo código para ${cleanEmail}: ${newCode}`);
      return res.json({ success: true, dev_code: newCode });
    }

  } catch (err) {
    console.error('[RESEND CODE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao reenviar código.' });
  }
});

/**
 * POST /api/auth/forgot-password
 * Recebe o e-mail, gera um código temporário de redefinição e envia por e-mail.
 * Body: { email }
 * Response: { success: true }
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'O email é obrigatório' });

    const cleanEmail = email.toLowerCase().trim();

    // Usuário existe?
    const user = await dbGetAsync('SELECT id, name FROM users WHERE email = ?', [cleanEmail]);
    if (!user) return res.status(404).json({ error: 'Nenhum usuário cadastrado com este email.' });

    // Gerar código de 6 dígitos
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    // Salvar código de redefinição na tabela verification_codes com pass_hash vazio para satisfazer a restrição NOT NULL
    await dbRunAsync('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
    await dbRunAsync(
      'INSERT INTO verification_codes (email, name, pass_hash, code, expires_at, attempts) VALUES (?, ?, ?, ?, ?, 0)',
      [cleanEmail, user.name, '', code, expiresAt]
    );

    console.log(`[FORGOT-PASSWORD] Solicitação de redefinição criada para ${cleanEmail}`);

    if (!isEmailConfigured()) {
      await dbRunAsync('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
      console.error('[EMAIL ERROR] SMTP nao configurado para redefinicao de senha.');
      return res.status(500).json({ error: 'Envio de e-mail não configurado. Tente novamente mais tarde.' });
    }

    try {
      await sendResetPasswordEmail(cleanEmail, user.name, code);
      console.log(`[EMAIL] ✅ Código de redefinição enviado para: ${cleanEmail}`);
      return res.json({
        success: true,
        message: 'Código de redefinição de senha enviado para o seu e-mail.'
      });
    } catch (mailErr) {
      await dbRunAsync('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
      console.error(`[EMAIL ERROR] Falha no envio para ${cleanEmail}. Erro:`, mailErr.message);
      return res.status(500).json({ error: 'Não foi possível enviar o código por e-mail. Tente novamente.' });
    }
  } catch (err) {
    console.error('[FORGOT PASSWORD ERROR]', err);
    return res.status(500).json({ error: 'Erro ao gerar solicitação de redefinição de senha.' });
  }
});

/**
 * POST /api/auth/verify-reset-code
 * Valida o código enviado por e-mail antes de liberar a troca da senha.
 * Body: { email, code }
 * Response: { success: true }
 */
app.post('/api/auth/verify-reset-code', async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code)
      return res.status(400).json({ error: 'Email e código são obrigatórios' });

    const cleanEmail = email.toLowerCase().trim();
    const record = await dbGetAsync('SELECT * FROM verification_codes WHERE email = ?', [cleanEmail]);
    if (!record)
      return res.status(400).json({ error: 'Nenhuma solicitação de redefinição pendente para este email.' });

    if (new Date() > new Date(record.expires_at)) {
      await dbRunAsync('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
      return res.status(400).json({ error: 'Código expirado. Solicite a redefinição novamente.' });
    }

    if (record.attempts >= 5) {
      await dbRunAsync('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
      return res.status(429).json({ error: 'Muitas tentativas incorretas. Solicite um novo código.' });
    }

    if (record.code !== String(code).trim()) {
      await dbRunAsync('UPDATE verification_codes SET attempts = attempts + 1 WHERE email = ?', [cleanEmail]);
      const remaining = Math.max(0, 4 - Number(record.attempts || 0));
      return res.status(400).json({
        error: `Código incorreto. Você tem ${remaining} tentativa(s) restante(s).`,
        attempts_left: remaining
      });
    }

    return res.json({ success: true, message: 'Código validado com sucesso.' });
  } catch (err) {
    console.error('[VERIFY RESET CODE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao validar o código de redefinição.' });
  }
});

/**
 * POST /api/auth/reset-password
 * Valida o código OTP e atualiza a senha do usuário.
 * Body: { email, code, password }
 * Response: { success: true }
 */
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { email, code, password } = req.body;
    if (!email || !code || !password)
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });

    if (password.length < 8)
      return res.status(400).json({ error: 'A nova senha deve ter no mínimo 8 caracteres' });

    const cleanEmail = email.toLowerCase().trim();

    // Buscar código no banco
    const record = await dbGetAsync('SELECT * FROM verification_codes WHERE email = ?', [cleanEmail]);
    if (!record)
      return res.status(400).json({ error: 'Nenhuma solicitação de redefinição pendente para este email.' });

    // Expirado?
    if (new Date() > new Date(record.expires_at)) {
      await dbRunAsync('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
      return res.status(400).json({ error: 'Código expirado. Solicite a redefinição novamente.' });
    }

    if (record.attempts >= 5) {
      await dbRunAsync('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
      return res.status(429).json({ error: 'Muitas tentativas incorretas. Solicite um novo código.' });
    }

    // Código correto?
    if (record.code !== String(code).trim()) {
      await dbRunAsync('UPDATE verification_codes SET attempts = attempts + 1 WHERE email = ?', [cleanEmail]);
      const remaining = Math.max(0, 4 - Number(record.attempts || 0));
      return res.status(400).json({
        error: `Código de redefinição incorreto. Você tem ${remaining} tentativa(s) restante(s).`,
        attempts_left: remaining
      });
    }

    // Gerar nova hash de senha e atualizar o usuário
    const pass_hash = await bcrypt.hash(password, 12);
    await dbRunAsync('UPDATE users SET password_hash = ? WHERE email = ?', [pass_hash, cleanEmail]);
    
    // Apagar código usado
    await dbRunAsync('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);

    console.log(`[AUTH] 🔑 Senha alterada com sucesso via redefinição: ${cleanEmail}`);
    return res.json({ success: true, message: 'Senha atualizada com sucesso!' });

  } catch (err) {
    console.error('[RESET PASSWORD ERROR]', err);
    return res.status(500).json({ error: 'Erro ao redefinir a sua senha.' });
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
  const CLIENT_ID = String(process.env.DISCORD_CLIENT_ID || '').trim();

  if (!CLIENT_ID || CLIENT_ID === 'SEU_CLIENT_ID_AQUI')
    return res.redirect('/login.html?auth_error=discord_not_configured');

  // Garante https em produção (Render usa proxy, x-forwarded-proto tem o protocolo real)
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host  = req.headers['x-forwarded-host']  || req.get('host');
  const REDIRECT_URI = String(process.env.DISCORD_REDIRECT_URI || `${proto}://${host}/auth/discord/callback`).trim();
  console.log(`[DISCORD] Redirect URI gerada: ${REDIRECT_URI}`);

  const params = new URLSearchParams({
    client_id:     CLIENT_ID,
    redirect_uri:  REDIRECT_URI,
    response_type: 'code',
    scope:         'identify email',
    prompt:        'consent',
  });
  res.redirect(`https://discord.com/api/oauth2/authorize?${params}`);
});

app.get('/auth/discord/callback', async (req, res) => {
  const { code, error } = req.query;
  if (error || !code) return res.redirect('/login.html?auth_error=discord_denied');

  try {
    const CLIENT_ID     = String(process.env.DISCORD_CLIENT_ID || '').trim();
    const CLIENT_SECRET = String(process.env.DISCORD_CLIENT_SECRET || '').trim();
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host  = req.headers['x-forwarded-host']  || req.get('host');
    const REDIRECT_URI  = String(process.env.DISCORD_REDIRECT_URI || `${proto}://${host}/auth/discord/callback`).trim();

    console.log(`[DISCORD CB] Iniciando callback. URI: ${REDIRECT_URI}`);
    console.log(`[DISCORD CB] CLIENT_ID existe: ${!!CLIENT_ID}, CLIENT_SECRET existe: ${!!CLIENT_SECRET}`);

    const tokenRes  = await fetch('https://discord.com/api/oauth2/token', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    new URLSearchParams({ client_id: CLIENT_ID, client_secret: CLIENT_SECRET, grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI }),
    });
    const tokenData = await tokenRes.json();
    console.log(`[DISCORD CB] Token response status: ${tokenRes.status}`);
    if (!tokenData.access_token) {
      console.error('[DISCORD CB] Falha no token:', JSON.stringify(tokenData));
      return res.redirect('/login.html?auth_error=discord_token_failed');
    }

    const userRes     = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userRes.json();
    console.log(`[DISCORD CB] User response status: ${userRes.status}, id: ${discordUser.id}`);
    if (!discordUser.id) return res.redirect('/login.html?auth_error=discord_user_failed');

    const discordName  = discordUser.global_name || discordUser.username;
    const discordEmail = discordUser.email || null;
    const discordTag   = discordUser.username;
    const avatarUrl    = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    let dbUser = await dbGetAsync('SELECT * FROM users WHERE discord_id = ?', [discordUser.id]);

    if (dbUser) {
      // Caso 1: já tem conta Discord — atualiza dados
      await dbRunAsync(
        `UPDATE users SET name=?, discord_tag=?, avatar=?, updated_at=datetime('now') WHERE discord_id=?`,
        [discordName, discordTag, avatarUrl, discordUser.id]
      );
      dbUser = await dbGetAsync('SELECT * FROM users WHERE discord_id = ?', [discordUser.id]);

    } else if (discordEmail && (dbUser = await dbGetAsync('SELECT * FROM users WHERE email = ?', [discordEmail]))) {
      // Caso 2: já existe conta com esse email (cadastro normal) — vincula Discord à conta existente
      console.log(`[DISCORD CB] Email ${discordEmail} já existe — vinculando Discord à conta existente.`);
      await dbRunAsync(
        `UPDATE users SET discord_id=?, discord_tag=?, avatar=?, updated_at=datetime('now') WHERE email=?`,
        [discordUser.id, discordTag, avatarUrl || dbUser.avatar, discordEmail]
      );
      dbUser = await dbGetAsync('SELECT * FROM users WHERE email = ?', [discordEmail]);

    } else {
      // Caso 3: novo usuário — cria conta
      const userId = await dbRunAsync(
        `INSERT INTO users (name, email, discord_id, discord_tag, avatar, method) VALUES (?, ?, ?, ?, ?, 'discord')`,
        [discordName, discordEmail, discordUser.id, discordTag, avatarUrl]
      );
      dbUser = await dbGetAsync('SELECT * FROM users WHERE id = ?', [userId]);
    }

    const token     = generateToken(dbUser);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await dbRunAsync('INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)', [dbUser.id, token, expiresAt]);

    console.log(`[AUTH] ✅ Discord: ${discordName}`);
    res.redirect(`/auth-callback.html?token=${encodeURIComponent(token)}&name=${encodeURIComponent(discordName)}`);

  } catch (err) {
    console.error('[DISCORD CALLBACK ERROR]', err.message, err.stack);
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
  activeUsers.delete(String(req.user.id));
  return res.json({ message: 'Logout realizado' });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  const user = dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
  return res.json({ valid: true, user: safeUser(user) });
});

app.post('/api/presence/heartbeat', requireAuth, (req, res) => {
  const user = dbGet('SELECT id, name, email FROM users WHERE id = ?', [req.user.id]);
  if (!user) return res.status(404).json({ error: 'Usuario nao encontrado' });

  const activity = req.body?.activity === 'watching' ? 'watching' : 'browsing';
  const profileId = req.body?.profileId ? String(req.body.profileId).slice(0, 80) : null;
  const profileName = req.body?.profileName ? String(req.body.profileName).slice(0, 120) : null;
  const pathName = req.body?.path ? String(req.body.path).slice(0, 180) : null;

  activeUsers.set(String(user.id), {
    userId: user.id,
    name: user.name,
    email: user.email,
    profileId,
    profileName,
    activity,
    path: pathName,
    lastSeen: Date.now()
  });

  return res.json({ ok: true });
});

// =============================================
//  ROUTES — PROFILES
// =============================================

/**
 * GET /api/profiles
 * Retorna todos os perfis do usuário autenticado.
 */
function sanitizeProfile(profile) {
  if (!profile) return profile;
  const { pin_hash, pinHash, ...safeProfile } = profile;
  safeProfile.has_pin = Boolean(pin_hash || pinHash);
  return safeProfile;
}

app.get('/api/profiles', requireAuth, (req, res) => {
  try {
    const profiles = dbAll('SELECT * FROM profiles WHERE user_id = ? ORDER BY created_at ASC', [req.user.id]);
    return res.json({ profiles: profiles.map(sanitizeProfile) });
  } catch (err) {
    console.error('[PROFILES GET ERROR]', err);
    return res.status(500).json({ error: 'Erro ao buscar perfis.' });
  }
});

/**
 * POST /api/profiles
 * Cria um novo perfil para o usuário autenticado.
 * Body: { name, avatar_color, avatar_icon, is_kid }
 */
app.post('/api/profiles', requireAuth, (req, res) => {
  try {
    const { name, avatar_color = '#FFD700', avatar_icon = '🎬', is_kid = 0 } = req.body;

    if (!name || name.trim().length < 1)
      return res.status(400).json({ error: 'Nome do perfil é obrigatório.' });
    if (name.trim().length > 20)
      return res.status(400).json({ error: 'Nome do perfil deve ter no máximo 20 caracteres.' });

    // Max 5 perfis por conta
    const count = dbGet('SELECT COUNT(*) as c FROM profiles WHERE user_id = ?', [req.user.id]);
    if (count && count.c >= 5)
      return res.status(400).json({ error: 'Limite máximo de 5 perfis por conta atingido.' });

    const id = dbRun(
      'INSERT INTO profiles (user_id, name, avatar_color, avatar_icon, is_kid) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, name.trim(), avatar_color, avatar_icon, is_kid ? 1 : 0]
    );

    const profile = dbGet('SELECT * FROM profiles WHERE id = ?', [id]);
    console.log(`[PROFILES] ✅ Perfil criado: "${name}" para user_id=${req.user.id}`);
    return res.status(201).json({ profile: sanitizeProfile(profile) });

  } catch (err) {
    console.error('[PROFILES POST ERROR]', err);
    return res.status(500).json({ error: 'Erro ao criar perfil.' });
  }
});

app.put('/api/profiles/:id', requireAuth, (req, res) => {
  try {
    const profileId = parseInt(req.params.id, 10);
    const profile = dbGet('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [profileId, req.user.id]);

    if (!profile)
      return res.status(404).json({ error: 'Perfil nao encontrado.' });

    const name = String(req.body.name || '').trim();
    const avatarColor = String(req.body.avatar_color || profile.avatar_color || '#FFD700').trim();
    const avatarIcon = String(req.body.avatar_icon || profile.avatar_icon || '🎬').trim();
    const pin = req.body.pin;

    if (!name)
      return res.status(400).json({ error: 'Nome do perfil e obrigatorio.' });
    if (name.length > 24)
      return res.status(400).json({ error: 'Nome do perfil deve ter no maximo 24 caracteres.' });
    if (!avatarIcon)
      return res.status(400).json({ error: 'Escolha um avatar para o perfil.' });

    let nextPinHash = profile.pin_hash || null;
    if (pin !== undefined) {
      const normalizedPin = String(pin).trim();
      if (normalizedPin === '') {
        nextPinHash = null;
      } else {
        if (!/^\d{4}$/.test(normalizedPin))
          return res.status(400).json({ error: 'O PIN deve ter exatamente 4 digitos.' });
        nextPinHash = bcrypt.hashSync(normalizedPin, 10);
      }
    }

    dbRun(
      'UPDATE profiles SET name = ?, avatar_color = ?, avatar_icon = ?, pin_hash = ? WHERE id = ? AND user_id = ?',
      [name, avatarColor, avatarIcon, nextPinHash, profileId, req.user.id]
    );

    const updatedProfile = dbGet('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [profileId, req.user.id]);
    return res.json({ profile: sanitizeProfile(updatedProfile) });
  } catch (err) {
    console.error('[PROFILES UPDATE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

app.post('/api/profiles/:id/avatar', requireAuth, (req, res) => {
  try {
    const profileId = parseInt(req.params.id, 10);
    const profile = dbGet('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [profileId, req.user.id]);
    if (!profile) {
      return res.status(404).json({ error: 'Perfil nao encontrado.' });
    }

    const imageData = String(req.body.imageData || '');
    const match = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      return res.status(400).json({ error: 'Imagem invalida.' });
    }

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
      return res.status(400).json({ error: 'Imagem deve ter no maximo 2MB.' });
    }

    const fileName = `profile-${req.user.id}-${profileId}-${Date.now()}.${ext}`;
    fs.writeFileSync(path.join(avatarsDir, fileName), buffer);

    const avatarUrl = `/uploads/avatars/${fileName}`;
    dbRun(
      'UPDATE profiles SET avatar_icon = ? WHERE id = ? AND user_id = ?',
      [avatarUrl, profileId, req.user.id]
    );

    const updatedProfile = dbGet('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [profileId, req.user.id]);
    return res.json({ profile: sanitizeProfile(updatedProfile), avatarUrl });
  } catch (err) {
    console.error('[PROFILE AVATAR UPLOAD ERROR]', err);
    return res.status(500).json({ error: 'Erro ao salvar avatar.' });
  }
});

app.post('/api/profiles/:id/verify-pin', requireAuth, (req, res) => {
  try {
    const profileId = parseInt(req.params.id, 10);
    const profile = dbGet('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [profileId, req.user.id]);

    if (!profile)
      return res.status(404).json({ error: 'Perfil nao encontrado.' });
    if (!profile.pin_hash)
      return res.json({ success: true });

    const pin = String(req.body.pin || '').trim();
    if (!/^\d{4}$/.test(pin))
      return res.status(400).json({ error: 'Informe o PIN de 4 digitos.' });

    const valid = bcrypt.compareSync(pin, profile.pin_hash);
    if (!valid)
      return res.status(401).json({ error: 'PIN incorreto.' });

    return res.json({ success: true });
  } catch (err) {
    console.error('[PROFILES VERIFY PIN ERROR]', err);
    return res.status(500).json({ error: 'Erro ao verificar PIN.' });
  }
});

/**
 * DELETE /api/profiles/:id
 * Remove um perfil (somente se pertencer ao usuário autenticado).
 */
app.delete('/api/profiles/:id', requireAuth, (req, res) => {
  try {
    const profileId = parseInt(req.params.id);
    const profile = dbGet('SELECT * FROM profiles WHERE id = ? AND user_id = ?', [profileId, req.user.id]);

    if (!profile)
      return res.status(404).json({ error: 'Perfil não encontrado.' });

    dbRun('DELETE FROM profiles WHERE id = ?', [profileId]);

    console.log(`[PROFILES] 🗑️ Perfil removido: id=${profileId} de user_id=${req.user.id}`);
    return res.json({ success: true });

  } catch (err) {
    console.error('[PROFILES DELETE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao remover perfil.' });
  }
});


// =============================================
//  ROUTE — PROXY STREAMING DE VÍDEO (Google Drive)
// =============================================
app.get('/api/video/stream', async (req, res) => {
  const fileId = req.query.id;
  if (!fileId) return res.status(400).send('ID do arquivo é obrigatório.');

  const driveUrl = `https://docs.google.com/uc?export=download&id=${fileId}`;

  try {
    // 1. Primeira requisição para capturar cookies e ver se o Google pede confirmação de vírus
    const firstRes = await fetch(driveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    let downloadUrl = driveUrl;
    const setCookieHeader = firstRes.headers.get('set-cookie');
    let cookies = '';

    if (setCookieHeader) {
      cookies = setCookieHeader.split(',').map(c => c.split(';')[0]).join('; ');
    }

    // Se o Google redirecionar ou pedir confirmação de arquivo grande (virus scan confirmation)
    const text = await firstRes.text();
    const confirmMatch = text.match(/confirm=([a-zA-Z0-9_]+)/);
    if (confirmMatch) {
      const confirmToken = confirmMatch[1];
      downloadUrl = `https://docs.google.com/uc?export=download&confirm=${confirmToken}&id=${fileId}`;
      console.log(`[VIDEO-PROXY] 🛡️ Confirmando antivírus do Google Drive. Token: ${confirmToken}`);
    }

    // 2. Fazer a requisição do stream real passando os cookies
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (cookies) {
      headers['Cookie'] = cookies;
    }

    // Passar o cabeçalho 'Range' do navegador (caso o player queira pular o tempo do vídeo)
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const videoRes = await fetch(downloadUrl, { headers });

    // Copiar os cabeçalhos de resposta essenciais do Google para o navegador do usuário
    res.status(videoRes.status);
    
    const contentRange = videoRes.headers.get('content-range');
    const contentType = videoRes.headers.get('content-type');
    const contentLength = videoRes.headers.get('content-length');
    const acceptRanges = videoRes.headers.get('accept-ranges');

    if (contentRange) res.setHeader('Content-Range', contentRange);
    if (contentType) res.setHeader('Content-Type', contentType);
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (acceptRanges) res.setHeader('Accept-Ranges', acceptRanges);

    // Envia o fluxo de vídeo (pipe/stream) diretamente para o cliente
    videoRes.body.pipe(res);

    videoRes.body.on('error', (err) => {
      console.error('[VIDEO-PROXY ERROR]', err);
    });

  } catch (err) {
    console.error('[VIDEO-PROXY CRITICAL ERROR]', err);
    res.status(500).send('Erro ao processar streaming do vídeo.');
  }
});

// =============================================
//  ADMIN API ENDPOINTS
// =============================================

// Login Admin
app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
  }

  if (username === 'admin' && password === ADMIN_PASSWORD) {
    const token = generateAdminToken();
    console.log('[ADMIN] ✅ Login administrativo efetuado');
    return res.json({ token });
  }

  return res.status(401).json({ error: 'Usuário ou senha incorretos' });
});

// Listar Usuários (Admin)
app.get('/api/admin/users', requireAdminAuth, (req, res) => {
  try {
    const users = dbAll('SELECT id, name, email, discord_tag, method, sub_active, sub_plan_id, sub_expires_at, sub_activated_at, created_at FROM users ORDER BY id DESC');
    return res.json({ users });
  } catch (err) {
    console.error('[ADMIN GET USERS ERROR]', err);
    return res.status(500).json({ error: 'Erro ao buscar usuários' });
  }
});

// Deletar Usuário (Admin)
app.get('/api/admin/active-users', requireAdminAuth, (req, res) => {
  return res.json(getActiveUsersSnapshot());
});

app.delete('/api/admin/users/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  try {
    // Apagar também sessões ativas do usuário deletado e os seus perfis
    dbRun('DELETE FROM sessions WHERE user_id = ?', [id]);
    dbRun('DELETE FROM profiles WHERE user_id = ?', [id]);
    dbRun('DELETE FROM users WHERE id = ?', [id]);
    activeUsers.delete(String(id));
    console.log(`[ADMIN] ❌ Usuário deletado. ID: ${id}`);
    return res.json({ success: true, message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    console.error('[ADMIN DELETE USER ERROR]', err);
    return res.status(500).json({ error: 'Erro ao deletar usuário' });
  }
});

// --- ADMIN API ENDPOINTS FOR PROFILES ---

// Listar Perfis de um Usuário Específico
app.get('/api/admin/users/:userId/profiles', requireAdminAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const profiles = dbAll('SELECT * FROM profiles WHERE user_id = ? ORDER BY created_at ASC', [userId]);
    return res.json({ profiles });
  } catch (err) {
    console.error('[ADMIN GET USER PROFILES ERROR]', err);
    return res.status(500).json({ error: 'Erro ao buscar perfis do usuário.' });
  }
});

// Criar Perfil para um Usuário Específico
app.post('/api/admin/users/:userId/profiles', requireAdminAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const { name, avatar_color = '#FFD700', avatar_icon = '🎬', is_kid = 0 } = req.body;

    if (!name || name.trim().length < 1)
      return res.status(400).json({ error: 'Nome do perfil é obrigatório.' });
    if (name.trim().length > 20)
      return res.status(400).json({ error: 'Nome do perfil deve ter no máximo 20 caracteres.' });

    const count = dbGet('SELECT COUNT(*) as c FROM profiles WHERE user_id = ?', [userId]);
    if (count && count.c >= 5)
      return res.status(400).json({ error: 'Limite máximo de 5 perfis por conta atingido.' });

    const id = dbRun(
      'INSERT INTO profiles (user_id, name, avatar_color, avatar_icon, is_kid) VALUES (?, ?, ?, ?, ?)',
      [userId, name.trim(), avatar_color, avatar_icon, is_kid ? 1 : 0]
    );

    const profile = dbGet('SELECT * FROM profiles WHERE id = ?', [id]);
    return res.status(201).json({ profile });
  } catch (err) {
    console.error('[ADMIN CREATE USER PROFILE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao criar perfil para o usuário.' });
  }
});

// Atualizar Perfil
app.put('/api/admin/profiles/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, avatar_color, avatar_icon, is_kid } = req.body;

    if (!name || name.trim().length < 1)
      return res.status(400).json({ error: 'Nome do perfil é obrigatório.' });

    dbRun(
      'UPDATE profiles SET name = ?, avatar_color = ?, avatar_icon = ?, is_kid = ? WHERE id = ?',
      [name.trim(), avatar_color, avatar_icon, is_kid ? 1 : 0, id]
    );

    const profile = dbGet('SELECT * FROM profiles WHERE id = ?', [id]);
    return res.json({ profile });
  } catch (err) {
    console.error('[ADMIN UPDATE PROFILE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao atualizar perfil.' });
  }
});

// Excluir Perfil
app.delete('/api/admin/profiles/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    dbRun('DELETE FROM profiles WHERE id = ?', [id]);
    return res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN DELETE PROFILE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao remover perfil.' });
  }
});

// --- ADMIN SUBSCRIPTION & PLANS API ENDPOINTS ---

// Listar Configurações de Planos (Admin)
app.get('/api/admin/plans', requireAdminAuth, (req, res) => {
  try {
    const plans = dbAll('SELECT * FROM plans ORDER BY id ASC');
    return res.json({ plans });
  } catch (err) {
    console.error('[ADMIN GET PLANS ERROR]', err);
    return res.status(500).json({ error: 'Erro ao buscar planos' });
  }
});

// Criar Novo Plano de Assinatura (Admin)
app.post('/api/admin/plans', requireAdminAuth, (req, res) => {
  try {
    const { name, price, screens, duration_days } = req.body;

    if (!name || price === undefined || screens === undefined || duration_days === undefined) {
      return res.status(400).json({ error: 'Todos os campos são obrigatórios (nome, preço, telas, duração em dias)' });
    }

    const planId = dbRun(
      'INSERT INTO plans (name, price, screens, duration_days) VALUES (?, ?, ?, ?)',
      [name, parseFloat(price), parseInt(screens), parseInt(duration_days)]
    );
    saveDb();

    const plan = dbGet('SELECT * FROM plans WHERE id = ?', [planId]);
    return res.json({ success: true, plan });
  } catch (err) {
    console.error('[ADMIN POST PLAN ERROR]', err);
    return res.status(500).json({ error: 'Erro ao criar plano' });
  }
});

// Atualizar Configuração de um Plano (Admin)
app.put('/api/admin/plans/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const { name, price, screens, duration_days } = req.body;

    if (!name || price === undefined || screens === undefined || duration_days === undefined)
      return res.status(400).json({ error: 'Nome, preço, telas e duração são obrigatórios' });

    dbRun(
      'UPDATE plans SET name = ?, price = ?, screens = ?, duration_days = ? WHERE id = ?',
      [name, parseFloat(price), parseInt(screens), parseInt(duration_days), id]
    );
    saveDb();

    const plan = dbGet('SELECT * FROM plans WHERE id = ?', [id]);
    return res.json({ plan });
  } catch (err) {
    console.error('[ADMIN PUT PLAN ERROR]', err);
    return res.status(500).json({ error: 'Erro ao atualizar plano' });
  }
});

// Excluir Plano de Assinatura (Admin)
app.delete('/api/admin/plans/:id', requireAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    
    // Não permitir excluir planos padrão (1, 2, 3) se quiser manter consistência simples
    if (parseInt(id) <= 3) {
      return res.status(400).json({ error: 'Os planos padrão (Bronze, Prata, Ouro) não podem ser excluídos, apenas editados.' });
    }

    dbRun('DELETE FROM plans WHERE id = ?', [id]);

    return res.json({ success: true, message: 'Plano excluído com sucesso.' });
  } catch (err) {
    console.error('[ADMIN DELETE PLAN ERROR]', err);
    return res.status(500).json({ error: 'Erro ao excluir plano' });
  }
});

// Ativar/Desativar Assinatura Manualmente (Admin - com datas customizadas)
app.post('/api/admin/users/:userId/subscribe', requireAdminAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const { active, planId, activatedAt, expiresAt } = req.body;

    const user = dbGet('SELECT id FROM users WHERE id = ?', [userId]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const subActive = active ? 1 : 0;
    const subPlanId = active ? parseInt(planId) : null;
    const subActivatedAt = active ? (activatedAt || new Date().toISOString()) : null;
    const subExpiresAt = active ? (expiresAt || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()) : null;

    dbRun(
      'UPDATE users SET sub_active = ?, sub_plan_id = ?, sub_activated_at = ?, sub_expires_at = ?, pending_txid = NULL, pending_plan_id = NULL WHERE id = ?',
      [subActive, subPlanId, subActivatedAt, subExpiresAt, userId]
    );

    // Salvar log de ativação manual
    if (active) {
      dbRun(
        "INSERT OR REPLACE INTO payment_logs (user_id, plan_id, txid, amount, status, created_at, paid_at) VALUES (?, ?, ?, ?, 'paid', ?, ?)",
        [userId, subPlanId, `manual_${Date.now()}`, 0.0, subActivatedAt, subActivatedAt]
      );
    }

    console.log(`[ADMIN] 💳 Assinatura do usuário ${userId} alterada para: ${active ? 'ATIVA' : 'INATIVA'}`);
    return res.json({ success: true });
  } catch (err) {
    console.error('[ADMIN USER SUBSCRIBE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao gerenciar assinatura' });
  }
});

// Listar Logs de Pagamento (Admin)
app.get('/api/admin/payments', requireAdminAuth, (req, res) => {
  try {
    const logs = dbAll(`
      SELECT 
        l.id, l.user_id, l.plan_id, l.txid, l.amount, l.status, l.created_at, l.paid_at,
        u.name as user_name, u.email as user_email,
        p.name as plan_name
      FROM payment_logs l
      LEFT JOIN users u ON l.user_id = u.id
      LEFT JOIN plans p ON l.plan_id = p.id
      ORDER BY l.id DESC
    `);
    return res.json({ logs });
  } catch (err) {
    console.error('[ADMIN GET PAYMENTS ERROR]', err);
    return res.status(500).json({ error: 'Erro ao buscar pagamentos' });
  }
});

// Upload de Logotipo e Favicon (Admin)
app.post('/api/admin/settings/upload', requireAdminAuth, (req, res) => {
  try {
    const { type, fileData } = req.body; // type: 'logo' ou 'favicon', fileData: base64 string

    if (!type || !fileData) {
      return res.status(400).json({ error: 'Parâmetros inválidos.' });
    }

    if (!['logo', 'favicon'].includes(type)) {
      return res.status(400).json({ error: 'Tipo de upload inválido.' });
    }

    // Limpar o prefixo data:image/...;base64, se existir
    const base64Data = fileData.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    const fileName = type === 'logo' ? 'logo.png' : 'favicon.png';
    const filePath = path.join(uploadsDir, fileName);

    fs.writeFileSync(filePath, buffer);
    console.log(`[SETTINGS] ⚙️ Upload de ${type} salvo com sucesso em: ${filePath}`);

    return res.json({ success: true, message: `Upload de ${type} concluído com sucesso!` });
  } catch (err) {
    console.error('[ADMIN UPLOAD SETTINGS ERROR]', err);
    return res.status(500).json({ error: 'Erro ao salvar o arquivo.' });
  }
});

// Upload de Legendas (.vtt ou .srt)
app.post('/api/admin/subtitles/upload', requireAdminAuth, (req, res) => {
  try {
    const { fileName, fileData } = req.body; // fileName: 'legenda.pt.vtt' ou 'legenda.srt', fileData: base64 string

    if (!fileName || !fileData) {
      return res.status(400).json({ error: 'Parâmetros inválidos. É necessário informar fileName e fileData.' });
    }

    const ext = path.extname(fileName).toLowerCase();
    if (ext !== '.vtt' && ext !== '.srt') {
      return res.status(400).json({ error: 'Formato de arquivo inválido. Apenas .vtt ou .srt são permitidos.' });
    }

    // Limpar o prefixo data:...;base64, se existir
    const base64Data = fileData.replace(/^data:[^;]*;base64,/, "");
    const buffer = Buffer.from(base64Data, 'base64');

    // Sanitizar nome do arquivo para evitar Path Traversal
    const safeName = path.basename(fileName);
    const filePath = path.join(subtitlesDir, safeName);

    fs.writeFileSync(filePath, buffer);
    console.log(`[SUBTITLES] 📂 Legenda salva com sucesso em: ${filePath}`);

    // Retornar o caminho relativo para ser inserido no input
    const relativeUrl = `/legendas/${safeName}`;
    return res.json({ success: true, subtitlesUrl: relativeUrl, message: 'Legenda salva com sucesso!' });
  } catch (err) {
    console.error('[ADMIN UPLOAD SUBTITLES ERROR]', err);
    return res.status(500).json({ error: 'Erro ao salvar a legenda.' });
  }
});

// --- USER SUBSCRIPTION API ENDPOINTS (requireAuth) ---

// Obter Assinatura do Usuário Logado
app.get('/api/user/subscription', requireAuth, (req, res) => {
  try {
    const user = dbGet('SELECT sub_active, sub_plan_id, sub_expires_at, sub_activated_at, pending_txid, has_used_trial FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    
    const plans = dbAll('SELECT * FROM plans ORDER BY id ASC');
    return res.json({ subscription: user, plans });
  } catch (err) {
    console.error('[USER GET SUB ERROR]', err);
    return res.status(500).json({ error: 'Erro ao buscar dados de assinatura' });
  }
});

// Ativar Teste Grátis de 2 Horas
app.get('/api/user/billing', requireAuth, (req, res) => {
  try {
    const logs = dbAll(`
      SELECT
        l.id, l.plan_id, l.txid, l.amount, l.status, l.created_at, l.paid_at,
        p.name as plan_name
      FROM payment_logs l
      LEFT JOIN plans p ON l.plan_id = p.id
      WHERE l.user_id = ?
      ORDER BY l.id DESC
    `, [req.user.id]);

    return res.json({ logs });
  } catch (err) {
    console.error('[USER BILLING ERROR]', err);
    return res.status(500).json({ error: 'Erro ao buscar cobrancas.' });
  }
});

app.get('/api/user/devices', requireAuth, (req, res) => {
  try {
    const sessions = dbAll(
      'SELECT id, token, created_at, expires_at FROM sessions WHERE user_id = ? ORDER BY id DESC',
      [req.user.id]
    ).map(session => ({
      id: session.id,
      name: 'GOATCINE Web',
      created_at: session.created_at,
      expires_at: session.expires_at,
      current: session.token === req.token
    }));

    return res.json({ devices: sessions });
  } catch (err) {
    console.error('[USER DEVICES ERROR]', err);
    return res.status(500).json({ error: 'Erro ao buscar dispositivos.' });
  }
});

app.delete('/api/user/devices/:id', requireAuth, (req, res) => {
  try {
    const sessionId = parseInt(req.params.id, 10);
    const session = dbGet('SELECT id, token FROM sessions WHERE id = ? AND user_id = ?', [sessionId, req.user.id]);

    if (!session)
      return res.status(404).json({ error: 'Dispositivo nao encontrado.' });

    dbRun('DELETE FROM sessions WHERE id = ? AND user_id = ?', [sessionId, req.user.id]);
    return res.json({ success: true, disconnectedCurrent: session.token === req.token });
  } catch (err) {
    console.error('[USER DEVICE DELETE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao desconectar dispositivo.' });
  }
});

app.delete('/api/user/account', requireAuth, (req, res) => {
  try {
    dbRun('DELETE FROM sessions WHERE user_id = ?', [req.user.id]);
    dbRun('DELETE FROM profiles WHERE user_id = ?', [req.user.id]);
    dbRun('DELETE FROM users WHERE id = ?', [req.user.id]);
    activeUsers.delete(String(req.user.id));
    return res.json({ success: true, message: 'Conta excluida com sucesso.' });
  } catch (err) {
    console.error('[USER DELETE ACCOUNT ERROR]', err);
    return res.status(500).json({ error: 'Erro ao excluir conta.' });
  }
});

app.post('/api/user/trial', requireAuth, (req, res) => {
  try {
    const user = dbGet('SELECT has_used_trial, sub_active FROM users WHERE id = ?', [req.user.id]);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (user.has_used_trial === 1) {
      return res.status(400).json({ error: 'Você já utilizou o seu período de teste grátis.' });
    }

    if (user.sub_active === 1) {
      return res.status(400).json({ error: 'Você já possui uma assinatura ativa.' });
    }

    const nowStr = new Date().toISOString();
    // Adicionar 2 horas de vigência (2 * 60 * 60 * 1000 = 7.200.000 ms)
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    dbRun(
      'UPDATE users SET sub_active = 1, sub_plan_id = NULL, sub_activated_at = ?, sub_expires_at = ?, has_used_trial = 1 WHERE id = ?',
      [nowStr, expiresAt, req.user.id]
    );

    // Salvar log de ativação de teste gratuito
    dbRun(
      "INSERT OR REPLACE INTO payment_logs (user_id, plan_id, txid, amount, status, created_at, paid_at) VALUES (?, NULL, ?, 0.0, 'paid', ?, ?)",
      [req.user.id, `trial_${Date.now()}`, nowStr, nowStr]
    );

    console.log(`[TRIAL] 🎁 Período de teste grátis (2h) ativado para usuário ID ${req.user.id}.`);
    return res.json({ success: true, message: 'Teste gratuito de 2 horas ativado com sucesso!' });
  } catch (err) {
    console.error('[USER POST TRIAL ERROR]', err);
    return res.status(500).json({ error: 'Erro ao ativar teste grátis' });
  }
});

// Helper para obter Token da API Efí Pix
async function getEfiToken() {
  const isSandbox = process.env.EFI_SANDBOX === 'true';
  const baseUrl = isSandbox ? 'https://api-pix-h.gerencianet.com.br' : 'https://api-pix.gerencianet.com.br';
  const certPath = path.resolve(__dirname, process.env.EFI_CERTIFICATE_PATH);
  
  if (!fs.existsSync(certPath)) {
    throw new Error(`Certificado Efí não encontrado no caminho: ${certPath}`);
  }

  const certData = fs.readFileSync(certPath);
  const isP12 = certPath.endsWith('.p12') || certPath.endsWith('.pfx');
  const agent = new https.Agent({
    ...(isP12 ? { pfx: certData } : { cert: certData, key: certData }),
    rejectUnauthorized: false
  });

  const auth = Buffer.from(`${process.env.EFI_CLIENT_ID}:${process.env.EFI_CLIENT_SECRET}`).toString('base64');

  const response = await fetch(`${baseUrl}/oauth/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
    agent
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Erro de autenticação com a Efí: ${errText}`);
  }

  const data = await response.json();
  return data.access_token;
}

// Iniciar Checkout PIX (Real via Efí ou Simulado)
app.post('/api/user/subscribe', requireAuth, async (req, res) => {
  try {
    const { planId } = req.body;
    if (!planId) return res.status(400).json({ error: 'Plano é obrigatório' });

    const plan = dbGet('SELECT * FROM plans WHERE id = ?', [planId]);
    if (!plan) return res.status(404).json({ error: 'Plano não encontrado' });

    const goatPayActive = !!process.env.GOATPAY_API_KEY;

    if (goatPayActive) {
      console.log(`[GOATPAY] 💳 Iniciando cobrança real via GoatPay para o usuário ${req.user.id}...`);
      try {
        const body = {
          amount: parseFloat(plan.price),
          description: `Assinatura GOATCINE - Plano ${plan.name}`,
          externalReference: `${req.user.id}_${planId}_${Date.now()}`
        };

        const secureFetch = (typeof globalThis !== 'undefined' && globalThis.fetch) ? globalThis.fetch : fetch;
        const response = await secureFetch('https://api.goatpay.com.br/v1/payment-pix/create', {
          method: 'POST',
          headers: {
            'X-API-Key': process.env.GOATPAY_API_KEY,
            'Content-Type': 'application/json',
            'Connection': 'close'
          },
          body: JSON.stringify(body)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Erro ao criar PIX na GoatPay: ${errText}`);
        }

        const resData = await response.json();
        if (!resData.success || !resData.data) {
          throw new Error(resData.message || 'Erro na resposta da GoatPay');
        }

        const txid = resData.data.id;
        const qrcodeImage = resData.data.qrCodeBase64;
        const qrcodeText = resData.data.copyPaste;

        // Salvar txid pendente no usuário
        dbRun('UPDATE users SET pending_txid = ?, pending_plan_id = ? WHERE id = ?', [txid, planId, req.user.id]);
        
        // Registrar log inicial pendente
        dbRun(
          "INSERT OR REPLACE INTO payment_logs (user_id, plan_id, txid, amount, status) VALUES (?, ?, ?, ?, 'pending')",
          [req.user.id, planId, txid, plan.price]
        );

        return res.json({
          realPix: true,
          txid,
          qrcodeImage,
          qrcodeText
        });
      } catch (goatErr) {
        console.error('[GOATPAY CRITICAL ERROR] Falha ao usar GoatPay. Revertendo para outros meios.', goatErr.message);
      }
    }

    const efiActive = !!(process.env.EFI_CLIENT_ID && process.env.EFI_CLIENT_SECRET && process.env.EFI_KEY && process.env.EFI_CERTIFICATE_PATH);

    if (efiActive) {
      console.log(`[EFI PIX] 💳 Iniciando cobrança real para o usuário ${req.user.id}...`);
      try {
        const isSandbox = process.env.EFI_SANDBOX === 'true';
        const baseUrl = isSandbox ? 'https://api-pix-h.gerencianet.com.br' : 'https://api-pix.gerencianet.com.br';
        const token = await getEfiToken();
        
        const certPath = path.resolve(__dirname, process.env.EFI_CERTIFICATE_PATH);
        const certData = fs.readFileSync(certPath);
        const isP12 = certPath.endsWith('.p12') || certPath.endsWith('.pfx');
        const agent = new https.Agent({
          ...(isP12 ? { pfx: certData } : { cert: certData, key: certData }),
          rejectUnauthorized: false
        });

        // Criar cobrança imediata (cob)
        const cobBody = {
          calendario: { expiracao: 3600 },
          devedor: {
            cpf: '12345678909', // CPF fictício para simplificar checkout imediato
            nome: req.user.name || 'Cliente GOATCINE'
          },
          valor: { original: plan.price.toFixed(2) },
          chave: process.env.EFI_KEY,
          solicitacaoPagador: `Assinatura GOATCINE - Plano ${plan.name}`
        };

        const cobRes = await fetch(`${baseUrl}/v2/cob`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(cobBody),
          agent
        });

        if (!cobRes.ok) {
          const errText = await cobRes.text();
          throw new Error(`Erro ao criar cob Efí: ${errText}`);
        }

        const cobData = await cobRes.json();
        const txid = cobData.txid;
        const locId = cobData.loc.id;

        // Gerar QR Code
        const qrRes = await fetch(`${baseUrl}/v2/loc/${locId}/qrcode`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}` },
          agent
        });

        if (!qrRes.ok) throw new Error('Erro ao gerar QR Code na Efí');
        const qrData = await qrRes.json();

        // Salvar txid pendente no usuário
        dbRun('UPDATE users SET pending_txid = ?, pending_plan_id = ? WHERE id = ?', [txid, planId, req.user.id]);
        
        // Registrar log inicial pendente
        dbRun(
          "INSERT OR REPLACE INTO payment_logs (user_id, plan_id, txid, amount, status) VALUES (?, ?, ?, ?, 'pending')",
          [req.user.id, planId, txid, plan.price]
        );

        return res.json({
          realPix: true,
          txid,
          qrcodeImage: qrData.imagemQrcode, // base64
          qrcodeText: qrData.qrcode // Copia e Cola
        });
      } catch (efiErr) {
        console.error('[EFI PIX CRITICAL ERROR] Falha ao usar gateway Efí. Revertendo para Simulado.', efiErr);
      }
    }

    // Fallback: Modo Simulado se as credenciais estiverem em branco ou falharem
    const valHex = plan.price.toFixed(2).replace('.', '');
    const txidMock = `mock${crypto.randomBytes(8).toString('hex')}`;
    const qrcodeTextMock = `00020101021226870014br.gov.bcb.pix2565pix.goatcine.com/sub/checkout/plan${planId}-${valHex}-${txidMock}`;

    dbRun('UPDATE users SET pending_txid = ?, pending_plan_id = ? WHERE id = ?', [txidMock, planId, req.user.id]);
    
    // Registrar log mock pendente
    dbRun(
      "INSERT OR REPLACE INTO payment_logs (user_id, plan_id, txid, amount, status) VALUES (?, ?, ?, ?, 'pending')",
      [req.user.id, planId, txidMock, plan.price]
    );

    return res.json({
      realPix: false,
      txid: txidMock,
      qrcodeText: qrcodeTextMock
    });

  } catch (err) {
    console.error('[SUBSCRIBE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao iniciar fluxo de assinatura' });
  }
});

// Webhook da GoatPay (Confirmação de pagamento via PIX)
app.post('/api/webhook/goatpay', (req, res) => {
  const signatureHeader = req.headers['x-goatpay-signature'];
  const webhookSecret = process.env.GOATPAY_WEBHOOK_SECRET;

  // Se o segredo está configurado, validar a assinatura HMAC
  if (webhookSecret) {
    if (!signatureHeader || !signatureHeader.startsWith('sha256=')) {
      console.warn('[GOATPAY WEBHOOK] ⚠️ Assinatura ausente ou formato inválido');
      return res.status(401).send('Invalid signature format');
    }

    const crypto = require('crypto');
    const received = signatureHeader.slice('sha256='.length);
    const expected = crypto
      .createHmac('sha256', webhookSecret)
      .update(req.rawBody || '')
      .digest('hex');

    const a = Buffer.from(expected, 'hex');
    const b = Buffer.from(received, 'hex');
    
    const isValid = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!isValid) {
      console.warn('[GOATPAY WEBHOOK] ❌ Assinatura inválida');
      return res.status(401).send('Invalid signature');
    }
  } else {
    console.warn('[GOATPAY WEBHOOK] ⚠️ Executando sem GOATPAY_WEBHOOK_SECRET configurado. Assinatura não validada.');
  }

  try {
    const { id, event, data } = req.body;
    if (event === 'payment.paid' && data && data.status === 'COMPLETED') {
      const txid = data.id;
      const extRef = data.externalReference; // "userId_planId"
      
      if (!extRef) {
        console.warn(`[GOATPAY WEBHOOK] externalReference ausente para transação ${txid}`);
        return res.status(200).send('Missing externalReference');
      }

      const parts = extRef.split('_');
      const userId = parseInt(parts[0], 10);
      const planId = parseInt(parts[1], 10);

      if (isNaN(userId) || isNaN(planId)) {
        console.warn(`[GOATPAY WEBHOOK] Formato inválido de externalReference: ${extRef}`);
        return res.status(200).send('Invalid externalReference format');
      }

      // Buscar se há usuário correspondente
      const user = dbGet('SELECT id FROM users WHERE id = ?', [userId]);
      if (user) {
        const nowStr = new Date().toISOString();
        const targetPlan = dbGet('SELECT duration_days FROM plans WHERE id = ?', [planId]);
        const days = targetPlan ? targetPlan.duration_days : 30;
        const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        
        dbRun(
          'UPDATE users SET sub_active = 1, sub_plan_id = ?, sub_activated_at = ?, sub_expires_at = ?, pending_txid = NULL, pending_plan_id = NULL WHERE id = ?',
          [planId, nowStr, expiresAt, userId]
        );

        // Atualizar ou inserir o log de pagamento
        dbRun(
          "INSERT OR REPLACE INTO payment_logs (user_id, plan_id, txid, amount, status, created_at, paid_at) VALUES (?, ?, ?, ?, 'paid', ?, ?)",
          [userId, planId, txid, data.amount, nowStr, nowStr]
        );
        console.log(`[GOATPAY WEBHOOK] 💳 Pagamento CONFIRMADO! Usuário ID ${userId} ativado no plano ${planId}.`);
      } else {
        console.warn(`[GOATPAY WEBHOOK] Usuário ID ${userId} não encontrado no banco.`);
      }
    }
    
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[GOATPAY WEBHOOK ERROR]', err);
    return res.status(500).send('Internal Error');
  }
});

// Webhook do Pix Banco Efí (GET/POST para homologação e recebimento real)
app.all('/api/webhook/pix', (req, res) => {
  // GET da Efí para validar configuração do webhook
  if (req.method === 'GET' || req.method === 'PUT') {
    return res.status(200).send('OK');
  }

  try {
    const pixList = req.body?.pix;
    if (Array.isArray(pixList)) {
      pixList.forEach(pix => {
        const txid = pix.txid;
        // Buscar se há usuário com esse txid pendente
        const user = dbGet('SELECT id, pending_plan_id FROM users WHERE pending_txid = ?', [txid]);
        if (user) {
          const nowStr = new Date().toISOString();
          const targetPlan = dbGet('SELECT duration_days FROM plans WHERE id = ?', [user.pending_plan_id]);
          const days = targetPlan ? targetPlan.duration_days : 30;
          const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
          
          dbRun(
            'UPDATE users SET sub_active = 1, sub_plan_id = ?, sub_activated_at = ?, sub_expires_at = ?, pending_txid = NULL, pending_plan_id = NULL WHERE id = ?',
            [user.pending_plan_id, nowStr, expiresAt, user.id]
          );

          // Atualizar o log de pagamento
          dbRun(
            "UPDATE payment_logs SET status = 'paid', paid_at = ? WHERE txid = ?",
            [nowStr, txid]
          );
          console.log(`[EFI WEBHOOK] 💳 Pagamento CONFIRMADO via Pix! Usuário ID ${user.id} ativado no plano ${user.pending_plan_id}.`);
        }
      });
    }
    return res.status(200).send('OK');
  } catch (err) {
    console.error('[EFI WEBHOOK ERROR]', err);
    return res.status(500).send('Erro interno');
  }
});



// =============================================
//  MOVIES API ENDPOINTS (Public & Admin CRUD)
// =============================================

// Listar todos os Filmes (Público)
app.get('/api/movies', (req, res) => {
  try {
    let movies = dbAll('SELECT * FROM movies ORDER BY position ASC, id DESC');
    movies = movies.map(m => {
      if (m.videourl !== undefined && m.videoUrl === undefined) {
        m.videoUrl = m.videourl;
      }
      if (m.subtitlesurl !== undefined && m.subtitlesUrl === undefined) {
        m.subtitlesUrl = m.subtitlesurl;
      }
      if (m.trailerurl !== undefined && m.trailerUrl === undefined) {
        m.trailerUrl = m.trailerurl;
      }
      m.poster = m.poster || DEFAULT_POSTER_URL;
      m.backdrop = m.backdrop || DEFAULT_BACKDROP_URL;
      return m;
    });
    return res.json({ movies });
  } catch (err) {
    console.error('[GET MOVIES ERROR]', err);
    return res.status(500).json({ error: 'Erro ao buscar catálogo de filmes' });
  }
});

// Reordenar Filmes (Admin)
app.post('/api/movies/reorder', requireAdminAuth, (req, res) => {
  try {
    const { items } = req.body; // Array de { id, position, category }
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Formato inválido. Esperado um array de itens.' });
    }

    for (const item of items) {
      const { id, position, category } = item;
      dbRun(
        'UPDATE movies SET position = ?, category = ? WHERE id = ?',
        [Number(position), category, id]
      );
    }

    return res.json({ success: true, message: 'Ordenação atualizada com sucesso!' });
  } catch (err) {
    console.error('[REORDER MOVIES ERROR]', err);
    return res.status(500).json({ error: 'Erro ao atualizar a ordenação dos títulos' });
  }
});

// Adicionar Filme (Admin)
app.post('/api/movies', requireAdminAuth, (req, res) => {
  try {
    const { title, year, duration, rating, genre, desc, poster, backdrop, director, cast, category, videoUrl, type, subtitlesUrl, trailerUrl } = req.body;
    const normalizedType = type === 'series' ? 'series' : 'movie';
    const isSeries = normalizedType === 'series';
    const finalDuration = isSeries ? (duration || 'Serie') : duration;
    const finalVideoUrl = isSeries ? (videoUrl || '') : videoUrl;
    const finalPoster = (poster || '').trim() || DEFAULT_POSTER_URL;
    const finalBackdrop = (backdrop || '').trim() || DEFAULT_BACKDROP_URL;
    const parsedRating = parseFloat(String(rating).replace(',', '.'));
    const finalSubtitlesUrl = (subtitlesUrl || '').trim() || null;
    const finalTrailerUrl = (trailerUrl || '').trim() || null;

    if (!title || !year || Number.isNaN(parsedRating) || !genre || !desc || !director || !cast || !category || (!isSeries && (!finalDuration || !finalVideoUrl))) {
      return res.status(400).json({ error: 'Todos os campos obrigatorios devem ser preenchidos' });
    }

    const movieId = dbRun(
      `INSERT INTO movies (title, year, duration, rating, genre, "desc", poster, backdrop, director, "cast", category, type, videoUrl, subtitlesUrl, trailerUrl) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, year, finalDuration, parsedRating, genre, desc, finalPoster, finalBackdrop, director, cast, category, normalizedType, finalVideoUrl, finalSubtitlesUrl, finalTrailerUrl]
    );
    if (!movieId) {
      return res.status(500).json({ error: 'Nao foi possivel salvar o titulo no banco de dados' });
    }

    const savedMovie = dbGet('SELECT * FROM movies WHERE id = ?', [movieId]);
    if (!savedMovie) {
      return res.status(500).json({ error: 'Titulo criado, mas nao foi encontrado na consulta de confirmacao' });
    }
    if (savedMovie.videourl !== undefined && savedMovie.videoUrl === undefined) {
      savedMovie.videoUrl = savedMovie.videourl;
    }
    if (savedMovie.subtitlesurl !== undefined && savedMovie.subtitlesUrl === undefined) {
      savedMovie.subtitlesUrl = savedMovie.subtitlesurl;
    }
    if (savedMovie.trailerurl !== undefined && savedMovie.trailerUrl === undefined) {
      savedMovie.trailerUrl = savedMovie.trailerurl;
    }

    console.log(`[ADMIN] 🎬 Novo titulo adicionado: "${title}" (ID: ${movieId})`);
    return res.status(201).json({ success: true, id: movieId, movie: savedMovie, message: 'Titulo adicionado com sucesso!' });
  } catch (err) {
    console.error('[ADD MOVIE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao adicionar titulo no catalogo' });
  }
});

// Editar Filme (Admin)
app.put('/api/movies/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  try {
    const { title, year, duration, rating, genre, desc, poster, backdrop, director, cast, category, videoUrl, type, subtitlesUrl, trailerUrl } = req.body;
    const normalizedType = type === 'series' ? 'series' : 'movie';
    const isSeries = normalizedType === 'series';
    const finalDuration = isSeries ? (duration || 'Serie') : duration;
    const finalVideoUrl = isSeries ? (videoUrl || '') : videoUrl;
    const finalPoster = (poster || '').trim() || DEFAULT_POSTER_URL;
    const finalBackdrop = (backdrop || '').trim() || DEFAULT_BACKDROP_URL;
    const parsedRating = parseFloat(String(rating).replace(',', '.'));
    const finalSubtitlesUrl = (subtitlesUrl || '').trim() || null;
    const finalTrailerUrl = (trailerUrl || '').trim() || null;

    if (!title || !year || Number.isNaN(parsedRating) || !genre || !desc || !director || !cast || !category || (!isSeries && (!finalDuration || !finalVideoUrl))) {
      return res.status(400).json({ error: 'Todos os campos obrigatorios devem ser preenchidos' });
    }

    dbRun(
      `UPDATE movies SET title=?, year=?, duration=?, rating=?, genre=?, "desc"=?, poster=?, backdrop=?, director=?, "cast"=?, category=?, type=?, videoUrl=?, subtitlesUrl=?, trailerUrl=?
       WHERE id=?`,
      [title, parseInt(year), finalDuration, parsedRating, genre, desc, finalPoster, finalBackdrop, director, cast, category, normalizedType, finalVideoUrl, finalSubtitlesUrl, finalTrailerUrl, id]
    );

    console.log(`[ADMIN] 🎬 Titulo atualizado: "${title}" (ID: ${id})`);
    return res.json({ success: true, message: 'Titulo atualizado com sucesso!' });
  } catch (err) {
    console.error('[EDIT MOVIE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao atualizar titulo' });
  }
});

function groupEpisodesBySeason(episodes) {
  const seasonsMap = new Map();
  episodes.forEach(ep => {
    const season = Number(ep.season);
    if (!seasonsMap.has(season)) {
      seasonsMap.set(season, []);
    }
    seasonsMap.get(season).push(ep);
  });

  return Array.from(seasonsMap.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([season, items]) => ({ season, episodes: items }));
}

// Listar episodios de uma serie
app.get('/api/movies/:id/episodes', (req, res) => {
  const { id } = req.params;
  try {
    const movie = dbGet('SELECT id, type FROM movies WHERE id = ?', [id]);
    if (!movie) {
      return res.status(404).json({ error: 'Titulo nao encontrado' });
    }

    let episodes = dbAll('SELECT * FROM episodes WHERE movie_id = ? ORDER BY season ASC, number ASC, id ASC', [id]);
    episodes = episodes.map(ep => {
      if (ep.subtitlesurl !== undefined && ep.subtitlesUrl === undefined) {
        ep.subtitlesUrl = ep.subtitlesurl;
      }
      return ep;
    });
    return res.json({ episodes, seasons: groupEpisodesBySeason(episodes) });
  } catch (err) {
    console.error('[GET EPISODES ERROR]', err);
    return res.status(500).json({ error: 'Erro ao buscar episodios' });
  }
});

// Adicionar episodio (Admin)
app.post('/api/movies/:id/episodes', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  try {
    const movie = dbGet('SELECT id, type FROM movies WHERE id = ?', [id]);
    if (!movie) {
      return res.status(404).json({ error: 'Serie nao encontrada' });
    }
    if ((movie.type || 'movie') !== 'series') {
      return res.status(400).json({ error: 'Episodios so podem ser cadastrados em series' });
    }

    const { season, number, title, duration, videoUrl, desc, subtitlesUrl } = req.body;
    if (!season || !number || !title || !duration || !videoUrl) {
      return res.status(400).json({ error: 'Temporada, numero, titulo, duracao e video sao obrigatorios' });
    }

    const finalSubtitlesUrl = (subtitlesUrl || '').trim() || null;

    const episodeId = dbRun(
      `INSERT INTO episodes (movie_id, season, number, title, duration, videoUrl, subtitlesUrl, desc)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, parseInt(season), parseInt(number), title, duration, videoUrl, finalSubtitlesUrl, desc || '']
    );

    return res.status(201).json({ success: true, id: episodeId, message: 'Episodio adicionado com sucesso!' });
  } catch (err) {
    console.error('[ADD EPISODE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao adicionar episodio' });
  }
});

// Editar episodio (Admin)
app.put('/api/episodes/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  try {
    const { season, number, title, duration, videoUrl, desc, subtitlesUrl } = req.body;
    if (!season || !number || !title || !duration || !videoUrl) {
      return res.status(400).json({ error: 'Temporada, numero, titulo, duracao e video sao obrigatorios' });
    }

    const finalSubtitlesUrl = (subtitlesUrl || '').trim() || null;

    dbRun(
      `UPDATE episodes SET season=?, number=?, title=?, duration=?, videoUrl=?, subtitlesUrl=?, desc=? WHERE id=?`,
      [parseInt(season), parseInt(number), title, duration, videoUrl, finalSubtitlesUrl, desc || '', id]
    );

    return res.json({ success: true, message: 'Episodio atualizado com sucesso!' });
  } catch (err) {
    console.error('[EDIT EPISODE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao atualizar episodio' });
  }
});

// Excluir episodio (Admin)
app.delete('/api/episodes/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  try {
    dbRun('DELETE FROM episodes WHERE id = ?', [id]);
    return res.json({ success: true, message: 'Episodio excluido com sucesso.' });
  } catch (err) {
    console.error('[DELETE EPISODE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao excluir episodio' });
  }
});

// Deletar Filme (Admin)
app.delete('/api/movies/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  try {
    dbRun('DELETE FROM episodes WHERE movie_id = ?', [id]);
    dbRun('DELETE FROM movies WHERE id = ?', [id]);
    console.log(`[ADMIN] ❌ Filme excluído. ID: ${id}`);
    return res.json({ success: true, message: 'Titulo removido do catalogo com sucesso.' });
  } catch (err) {
    console.error('[DELETE MOVIE ERROR]', err);
    return res.status(500).json({ error: 'Erro ao excluir titulo' });
  }
});

// =============================================
//  AMIGAVEIS / OUTROS
// =============================================
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

app.get('/auth-callback', (req, res) => {
  res.sendFile(path.join(__dirname, 'auth-callback.html'));
});

app.get('/gerenciar-perfis', (req, res) => {
  res.sendFile(path.join(__dirname, 'profiles.html'));
});

app.get(['/filmes', '/series'], (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/minha-lista', (req, res) => {
  res.sendFile(path.join(__dirname, 'my-goat.html'));
});

app.get(['/conta', '/assinatura', '/cobranca', '/dispositivos'], (req, res) => {
  res.sendFile(path.join(__dirname, 'account-profile.html'));
});

// HLS Proxy para ignorar bloqueio CORS e Referer do Cloudflare
app.options('/api/hls-proxy/:host/*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.sendStatus(200);
});

app.get('/api/hls-proxy/:host/*', (req, res) => {
  const https = require('https');
  const targetHost = req.params.host;
  const targetPath = req.params[0];

  // Restrição de Segurança: Apenas domínios autorizados
  const allowedDomains = ['telabrasil.shop', 'axplay.shop', 'r2.dev'];
  const isAllowed = allowedDomains.some(domain => targetHost.endsWith(domain));
  if (!isAllowed) {
    return res.status(403).json({ error: 'Domínio não permitido no proxy HLS' });
  }

  const queryString = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
  const targetUrl = `https://${targetHost}/${targetPath}${queryString}`;

  const options = {
    method: 'GET',
    headers: {
      'Referer': 'https://www.axplay.shop/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
  };

  const proxyReq = https.request(targetUrl, options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    
    if (proxyRes.headers['content-type']) {
      res.setHeader('content-type', proxyRes.headers['content-type']);
    }
    
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error('[HLS PROXY ERROR]', err.message);
    res.status(500).json({ error: 'Erro no proxy HLS' });
  });

  proxyReq.end();
});

// =============================================
//  PROXY: RedetToons / GoatCine MP4 Streaming
//  Faz pipe do vídeo externo com suporte a Range
//  requests, permitindo seek no player nativo.
// =============================================
app.options('/api/redetoons-proxy', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Range, If-Range, If-Modified-Since');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.sendStatus(200);
});

app.get('/api/redetoons-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).json({ error: 'Parâmetro url ausente' });

  // Aceitar apenas URLs do redetoons.fun por segurança
  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch {
    return res.status(400).json({ error: 'URL inválida' });
  }

  if (!parsedUrl.hostname.endsWith('redetoons.fun')) {
    return res.status(403).json({ error: 'Domínio não permitido no proxy' });
  }

  const https = require('https');

  // Passar Range header do cliente ao servidor de origem
  const upstreamHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Referer': 'https://redetoons.fun/',
    'Origin': 'https://redetoons.fun'
  };
  if (req.headers['range']) {
    upstreamHeaders['Range'] = req.headers['range'];
  }
  if (req.headers['if-range']) {
    upstreamHeaders['If-Range'] = req.headers['if-range'];
  }

  const options = {
    method: req.method === 'HEAD' ? 'HEAD' : 'GET',
    headers: upstreamHeaders
  };

  const proxyReq = https.request(targetUrl, options, (proxyRes) => {
    const statusCode = proxyRes.statusCode;
    res.status(statusCode);

    // Repassar headers relevantes para streaming
    const forwardHeaders = [
      'content-type', 'content-length', 'content-range',
      'accept-ranges', 'etag', 'last-modified', 'cache-control'
    ];
    forwardHeaders.forEach(h => {
      if (proxyRes.headers[h]) res.setHeader(h, proxyRes.headers[h]);
    });

    // Garantir content-type como video para evitar download
    if (!proxyRes.headers['content-type'] || !proxyRes.headers['content-type'].startsWith('video')) {
      res.setHeader('Content-Type', 'video/mp4');
    }

    // Remover Content-Disposition para evitar download forçado
    res.removeHeader('Content-Disposition');

    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'Range, If-Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges, Content-Type');

    if (options.method === 'HEAD') {
      res.end();
    } else {
      proxyRes.pipe(res);
    }
  });

  proxyReq.on('error', (err) => {
    console.error('[REDETOONS PROXY ERROR]', err.message);
    if (!res.headersSent) res.status(502).json({ error: 'Erro no proxy de vídeo' });
  });

  proxyReq.end();
});

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
    console.log(`  🔑 Login: http://localhost:${PORT}/login`);
    console.log(`  🛡️ Admin: http://localhost:${PORT}/admin`);
    console.log('  ─────────────────────────────────────────');
    console.log('  🔑 CREDENCIAIS DO PAINEL ADMIN:');
    console.log('     Usuário: admin');
    console.log(`     Senha:   ${ADMIN_PASSWORD}`);
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

// Banco de dados recarregado com todas as temporadas de Origem.
