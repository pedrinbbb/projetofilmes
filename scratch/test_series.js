const fetch = require('node-fetch');
require('dotenv').config();

const API = process.env.TEST_API_URL || 'http://localhost:3000';
const ADMIN_PASS = process.env.ADMIN_PASS;

async function request(path, options = {}) {
  const res = await fetch(`${API}${path}`, options);
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(`${options.method || 'GET'} ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

async function main() {
  if (!ADMIN_PASS) {
    throw new Error('Defina ADMIN_PASS no .env ou no ambiente antes de rodar este teste.');
  }

  const login = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: ADMIN_PASS })
  });

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${login.token}`
  };

  const suffix = Date.now();
  const created = await request('/api/movies', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      type: 'series',
      title: `Serie Teste ${suffix}`,
      year: 2026,
      duration: '',
      rating: 9.1,
      genre: 'Drama',
      category: 'new',
      poster: 'https://example.com/poster.jpg',
      backdrop: 'https://example.com/backdrop.jpg',
      director: 'Teste',
      cast: 'Elenco Teste',
      videoUrl: '',
      desc: 'Serie criada pelo teste automatizado.'
    })
  });

  const seriesId = created.id;

  await request(`/api/movies/${seriesId}/episodes`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      season: 1,
      number: 1,
      title: 'Piloto',
      duration: '47min',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      desc: 'Primeiro episodio de teste.'
    })
  });

  await request(`/api/movies/${seriesId}/episodes`, {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      season: 1,
      number: 2,
      title: 'Segundo Episodio',
      duration: '45min',
      videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
      desc: 'Segundo episodio de teste.'
    })
  });

  const episodes = await request(`/api/movies/${seriesId}/episodes`);
  if (episodes.episodes.length !== 2 || episodes.seasons.length !== 1) {
    throw new Error(`Consulta de episodios inesperada: ${JSON.stringify(episodes)}`);
  }

  await request(`/api/movies/${seriesId}`, {
    method: 'DELETE',
    headers: { Authorization: authHeaders.Authorization }
  });

  let cascadeOk = false;
  try {
    await request(`/api/movies/${seriesId}/episodes`);
  } catch (err) {
    cascadeOk = err.message.includes('404');
  }
  if (!cascadeOk) {
    throw new Error('A serie removida ainda respondeu na consulta de episodios.');
  }

  console.log('OK: serie criada, episodios consultados e remocao validada.');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
