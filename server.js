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
const { Pool }  = require('pg');
const initSqlJs  = require('sql.js');
const crypto     = require('crypto');
const https      = require('https');

const app        = express();
const PORT       = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'goatcine_dev_secret';

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


// =============================================
//  EMAIL TRANSPORTER
// =============================================
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, 
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false
  },
  connectionTimeout: 15000, 
  greetingTimeout: 15000,
  socketTimeout: 15000
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

  await transporter.sendMail({
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
      videoUrl    VARCHAR(500) NOT NULL
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
      avatar_icon  VARCHAR(50) NOT NULL DEFAULT '🎬',
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
    try { db.run('ALTER TABLE plans ADD COLUMN duration_days INTEGER DEFAULT 30'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN sub_active INTEGER DEFAULT 0'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN sub_plan_id INTEGER DEFAULT NULL'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN sub_expires_at TEXT DEFAULT NULL'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN sub_activated_at TEXT DEFAULT NULL'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN pending_txid TEXT DEFAULT NULL'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN pending_plan_id INTEGER DEFAULT NULL'); } catch (e) {}
    try { db.run('ALTER TABLE users ADD COLUMN has_used_trial INTEGER DEFAULT 0'); } catch (e) {}
  } else {
    await dbRunSync("ALTER TABLE movies ADD COLUMN IF NOT EXISTS type VARCHAR(50) DEFAULT 'movie'");
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

  console.log('  ✅ Banco de dados pronto e iniciado');
}

const deasync = require('deasync');

// Tradutor de queries de SQLite (?) para PostgreSQL ($1, $2, $3...)
function translateQuery(sql) {
  if (!IS_POSTGRES) {
    return sql;
  }
  
  // PostgreSQL: substituir placeholders ? por $1, $2, $3...
  let paramCount = 0;
  let translatedSql = sql.replace(/\?/g, () => {
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
app.use(express.json({ limit: '15mb' })); // Aumentar limite para aceitar imagens em base64
app.use(express.urlencoded({ extended: false, limit: '15mb' }));

// Criar pasta de uploads no diretório persistente se disponível, ou no local
const uploadsDir = PERSISTENT_DIR ? path.join(PERSISTENT_DIR, 'uploads') : path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Servir a pasta raiz do projeto e a pasta de uploads persistente
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
 * Recebe o e-mail, gera um código temporário de redefinição no banco e o retorna.
 * Body: { email }
 * Response: { success: true, dev_code }
 */
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'O email é obrigatório' });

    const cleanEmail = email.toLowerCase().trim();

    // Usuário existe?
    const user = dbGet('SELECT id, name FROM users WHERE email = ?', [cleanEmail]);
    if (!user) return res.status(404).json({ error: 'Nenhum usuário cadastrado com este email.' });

    // Gerar código de 6 dígitos
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

    // Salvar código de redefinição na tabela verification_codes com pass_hash vazio para satisfazer a restrição NOT NULL
    dbRun('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
    dbRun(
      'INSERT INTO verification_codes (email, name, pass_hash, code, expires_at, attempts) VALUES (?, ?, ?, ?, ?, 0)',
      [cleanEmail, user.name, '', code, expiresAt]
    );

    console.log(`[FORGOT-PASSWORD] 🔑 Código gerado para redefinição de ${cleanEmail}: ${code}`);

    if (isEmailConfigured()) {
      try {
        await sendResetPasswordEmail(cleanEmail, user.name, code);
        console.log(`[EMAIL] ✅ Código de redefinição enviado para: ${cleanEmail}`);
        return res.json({
          success: true,
          message: 'Código de redefinição de senha enviado para o seu e-mail.'
        });
      } catch (mailErr) {
        console.error(`[EMAIL ERROR] Falha no envio para ${cleanEmail}. Erro:`, mailErr.message);
        console.log(`[EMAIL] ⚠️ Fallback ativo no forgot-password — Código: ${code}`);
        return res.json({
          success: true,
          dev_code: code,
          message: 'Falha ao enviar e-mail. Usando modo de desenvolvimento.'
        });
      }
    } else {
      console.log(`[EMAIL] ⚠️  Dev mode — Código de redefinição para ${cleanEmail}: ${code}`);
      return res.json({
        success: true,
        dev_code: code,
        message: 'Código gerado no console (Modo Desenvolvimento).'
      });
    }

  } catch (err) {
    console.error('[FORGOT PASSWORD ERROR]', err);
    return res.status(500).json({ error: 'Erro ao gerar solicitação de redefinição de senha.' });
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
    const record = dbGet('SELECT * FROM verification_codes WHERE email = ?', [cleanEmail]);
    if (!record)
      return res.status(400).json({ error: 'Nenhuma solicitação de redefinição pendente para este email.' });

    // Expirado?
    if (new Date() > new Date(record.expires_at)) {
      dbRun('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);
      return res.status(400).json({ error: 'Código expirado. Solicite a redefinição novamente.' });
    }

    // Código correto?
    if (record.code !== String(code).trim()) {
      return res.status(400).json({ error: 'Código de redefinição incorreto.' });
    }

    // Gerar nova hash de senha e atualizar o usuário
    const pass_hash = await bcrypt.hash(password, 12);
    dbRun('UPDATE users SET password_hash = ? WHERE email = ?', [pass_hash, cleanEmail]);
    
    // Apagar código usado
    dbRun('DELETE FROM verification_codes WHERE email = ?', [cleanEmail]);

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
  const CLIENT_ID    = process.env.DISCORD_CLIENT_ID;

  if (!CLIENT_ID || CLIENT_ID === 'SEU_CLIENT_ID_AQUI')
    return res.redirect('/login.html?auth_error=discord_not_configured');

  // Garante https em produção (Render usa proxy, x-forwarded-proto tem o protocolo real)
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host  = req.headers['x-forwarded-host']  || req.get('host');
  const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || `${proto}://${host}/auth/discord/callback`;
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
    const CLIENT_ID     = process.env.DISCORD_CLIENT_ID;
    const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
    const proto = req.headers['x-forwarded-proto'] || req.protocol;
    const host  = req.headers['x-forwarded-host']  || req.get('host');
    const REDIRECT_URI  = process.env.DISCORD_REDIRECT_URI || `${proto}://${host}/auth/discord/callback`;

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

    let dbUser = dbGet('SELECT * FROM users WHERE discord_id = ?', [discordUser.id]);

    if (dbUser) {
      // Caso 1: já tem conta Discord — atualiza dados
      dbRun(
        `UPDATE users SET name=?, discord_tag=?, avatar=?, updated_at=datetime('now') WHERE discord_id=?`,
        [discordName, discordTag, avatarUrl, discordUser.id]
      );
      dbUser = dbGet('SELECT * FROM users WHERE discord_id = ?', [discordUser.id]);

    } else if (discordEmail && (dbUser = dbGet('SELECT * FROM users WHERE email = ?', [discordEmail]))) {
      // Caso 2: já existe conta com esse email (cadastro normal) — vincula Discord à conta existente
      console.log(`[DISCORD CB] Email ${discordEmail} já existe — vinculando Discord à conta existente.`);
      dbRun(
        `UPDATE users SET discord_id=?, discord_tag=?, avatar=?, updated_at=datetime('now') WHERE email=?`,
        [discordUser.id, discordTag, avatarUrl || dbUser.avatar, discordEmail]
      );
      dbUser = dbGet('SELECT * FROM users WHERE email = ?', [discordEmail]);

    } else {
      // Caso 3: novo usuário — cria conta
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
  return res.json({ message: 'Logout realizado' });
});

app.get('/api/auth/verify', requireAuth, (req, res) => {
  const user = dbGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
  return res.json({ valid: true, user: safeUser(user) });
});

// =============================================
//  ROUTES — PROFILES
// =============================================

/**
 * GET /api/profiles
 * Retorna todos os perfis do usuário autenticado.
 */
app.get('/api/profiles', requireAuth, (req, res) => {
  try {
    const profiles = dbAll('SELECT * FROM profiles WHERE user_id = ? ORDER BY created_at ASC', [req.user.id]);
    return res.json({ profiles });
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
    return res.status(201).json({ profile });

  } catch (err) {
    console.error('[PROFILES POST ERROR]', err);
    return res.status(500).json({ error: 'Erro ao criar perfil.' });
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
app.delete('/api/admin/users/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  try {
    // Apagar também sessões ativas do usuário deletado e os seus perfis
    dbRun('DELETE FROM sessions WHERE user_id = ?', [id]);
    dbRun('DELETE FROM profiles WHERE user_id = ?', [id]);
    dbRun('DELETE FROM users WHERE id = ?', [id]);
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
    let movies = dbAll('SELECT * FROM movies ORDER BY id DESC');
    movies = movies.map(m => {
      if (m.videourl !== undefined && m.videoUrl === undefined) {
        m.videoUrl = m.videourl;
      }
      return m;
    });
    return res.json({ movies });
  } catch (err) {
    console.error('[GET MOVIES ERROR]', err);
    return res.status(500).json({ error: 'Erro ao buscar catálogo de filmes' });
  }
});

// Adicionar Filme (Admin)
app.post('/api/movies', requireAdminAuth, (req, res) => {
  try {
    const { title, year, duration, rating, genre, desc, poster, backdrop, director, cast, category, videoUrl, type } = req.body;
    const normalizedType = type === 'series' ? 'series' : 'movie';
    const isSeries = normalizedType === 'series';
    const finalDuration = isSeries ? (duration || 'Serie') : duration;
    const finalVideoUrl = isSeries ? (videoUrl || '') : videoUrl;
    const parsedRating = parseFloat(rating);

    if (!title || !year || Number.isNaN(parsedRating) || !genre || !desc || !poster || !backdrop || !director || !cast || !category || (!isSeries && (!finalDuration || !finalVideoUrl))) {
      return res.status(400).json({ error: 'Todos os campos obrigatorios devem ser preenchidos' });
    }

    const movieId = dbRun(
      `INSERT INTO movies (title, year, duration, rating, genre, desc, poster, backdrop, director, cast, category, type, videoUrl) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, year, finalDuration, parsedRating, genre, desc, poster, backdrop, director, cast, category, normalizedType, finalVideoUrl]
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
    const { title, year, duration, rating, genre, desc, poster, backdrop, director, cast, category, videoUrl, type } = req.body;
    const normalizedType = type === 'series' ? 'series' : 'movie';
    const isSeries = normalizedType === 'series';
    const finalDuration = isSeries ? (duration || 'Serie') : duration;
    const finalVideoUrl = isSeries ? (videoUrl || '') : videoUrl;
    const parsedRating = parseFloat(rating);

    if (!title || !year || Number.isNaN(parsedRating) || !genre || !desc || !poster || !backdrop || !director || !cast || !category || (!isSeries && (!finalDuration || !finalVideoUrl))) {
      return res.status(400).json({ error: 'Todos os campos obrigatorios devem ser preenchidos' });
    }

    dbRun(
      `UPDATE movies SET title=?, year=?, duration=?, rating=?, genre=?, desc=?, poster=?, backdrop=?, director=?, cast=?, category=?, type=?, videoUrl=?
       WHERE id=?`,
      [title, parseInt(year), finalDuration, parsedRating, genre, desc, poster, backdrop, director, cast, category, normalizedType, finalVideoUrl, id]
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

    const episodes = dbAll('SELECT * FROM episodes WHERE movie_id = ? ORDER BY season ASC, number ASC, id ASC', [id]);
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

    const { season, number, title, duration, videoUrl, desc } = req.body;
    if (!season || !number || !title || !duration || !videoUrl) {
      return res.status(400).json({ error: 'Temporada, numero, titulo, duracao e video sao obrigatorios' });
    }

    const episodeId = dbRun(
      `INSERT INTO episodes (movie_id, season, number, title, duration, videoUrl, desc)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, parseInt(season), parseInt(number), title, duration, videoUrl, desc || '']
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
    const { season, number, title, duration, videoUrl, desc } = req.body;
    if (!season || !number || !title || !duration || !videoUrl) {
      return res.status(400).json({ error: 'Temporada, numero, titulo, duracao e video sao obrigatorios' });
    }

    dbRun(
      `UPDATE episodes SET season=?, number=?, title=?, duration=?, videoUrl=?, desc=? WHERE id=?`,
      [parseInt(season), parseInt(number), title, duration, videoUrl, desc || '', id]
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
