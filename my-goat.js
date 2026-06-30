const token = localStorage.getItem('goatcine_token');
const profile = JSON.parse(localStorage.getItem('goatcine_profile') || 'null');
const user = JSON.parse(localStorage.getItem('goatcine_user') || 'null');

if (!token) {
  window.location.replace('/login.html');
}

if (!profile?.id) {
  window.location.replace('/profiles.html');
}

const $ = (id) => document.getElementById(id);
const avatar = $('goat-avatar');
const profileName = $('goat-profile-name');
const searchInput = $('goat-search-input');
const settingsBtn = $('goat-settings-btn');
const settingsMenu = $('goat-settings-menu');
const grid = $('goat-list-grid');
const empty = $('goat-empty');
const count = $('goat-list-count');
const toast = $('toast');

let allMovies = [];
let listIds = [];
let toastTimer = null;

function getMyListKey() {
  return `goatcine_my_list_${profile?.id || 'default'}`;
}

function readMyList() {
  try {
    return JSON.parse(localStorage.getItem(getMyListKey()) || '[]').map(String);
  } catch {
    return [];
  }
}

function saveMyList(ids) {
  localStorage.setItem(getMyListKey(), JSON.stringify(ids.map(String)));
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2400);
}

function isImageAvatar(value) {
  return /^(https?:\/\/|data:image\/)/i.test(value || '');
}

function renderProfile() {
  const name = profile?.name || user?.name || 'Minha tela';
  profileName.textContent = name;

  if (profile?.avatar_icon && isImageAvatar(profile.avatar_icon)) {
    avatar.innerHTML = `<img src="${profile.avatar_icon}" alt="${name}" referrerpolicy="no-referrer" />`;
    return;
  }

  avatar.textContent = (name[0] || 'G').toUpperCase();
}

function fallbackPoster(title) {
  const safeTitle = encodeURIComponent(title || 'GOATCINE');
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='480' viewBox='0 0 320 480'%3E%3Crect width='320' height='480' fill='%230b0b0b'/%3E%3Crect x='18' y='18' width='284' height='444' rx='24' fill='%23141414' stroke='%23ffd700' stroke-opacity='.42'/%3E%3Ctext x='50%25' y='48%25' text-anchor='middle' fill='%23ffd700' font-family='Arial' font-size='30' font-weight='700'%3EGOATCINE%3C/text%3E%3Ctext x='50%25' y='56%25' text-anchor='middle' fill='%23f7f7f7' font-family='Arial' font-size='18'%3E${safeTitle}%3C/text%3E%3C/svg%3E`;
}

function getListedMovies() {
  const idSet = new Set(listIds.map(String));
  const query = searchInput.value.trim().toLowerCase();

  return allMovies
    .filter((movie) => idSet.has(String(movie.id)))
    .filter((movie) => {
      if (!query) return true;
      return [movie.title, movie.genre, movie.cast, movie.director]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
}

function renderList() {
  const movies = getListedMovies();
  const total = listIds.length;
  count.textContent = `${total} ${total === 1 ? 'titulo' : 'titulos'}`;
  grid.innerHTML = '';

  if (movies.length === 0) {
    empty.classList.remove('hidden');
    empty.querySelector('h3').textContent = total === 0
      ? 'Sua lista ainda esta vazia'
      : 'Nada encontrado nessa busca';
    empty.querySelector('p').textContent = total === 0
      ? 'Adicione filmes e series pelo botao Minha Lista no catalogo principal.'
      : 'Tente buscar por outro titulo, genero ou artista.';
    return;
  }

  empty.classList.add('hidden');

  movies.forEach((movie) => {
    const card = document.createElement('article');
    card.className = 'goat-card';
    card.innerHTML = `
      <img src="${movie.poster || fallbackPoster(movie.title)}" alt="${movie.title}" loading="lazy" />
      <button class="goat-remove-btn" type="button" aria-label="Remover ${movie.title} da lista">
        <i class="fa-solid fa-xmark"></i>
      </button>
      <div class="goat-card-info">
        <strong>${movie.title}</strong>
        <small>${movie.year || ''} ${movie.type === 'series' ? 'Serie' : 'Filme'}</small>
      </div>
    `;

    card.querySelector('img').onerror = (event) => {
      event.currentTarget.src = fallbackPoster(movie.title);
    };

    card.querySelector('.goat-remove-btn').addEventListener('click', () => {
      listIds = listIds.filter((id) => id !== String(movie.id));
      saveMyList(listIds);
      showToast('Removido da Minha lista');
      renderList();
    });

    grid.appendChild(card);
  });
}

async function loadMovies() {
  try {
    const res = await fetch('/api/movies', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('catalog');
    const data = await res.json();
    allMovies = (data.movies || []).map((movie) => ({
      ...movie,
      type: movie.type === 'series' ? 'series' : 'movie'
    }));
  } catch {
    allMovies = [];
    showToast('Nao foi possivel carregar o catalogo.');
  }

  listIds = readMyList();
  renderList();
}

settingsBtn.addEventListener('click', (event) => {
  event.stopPropagation();
  settingsMenu.classList.toggle('show');
  settingsBtn.setAttribute('aria-expanded', settingsMenu.classList.contains('show') ? 'true' : 'false');
  settingsMenu.setAttribute('aria-hidden', settingsMenu.classList.contains('show') ? 'false' : 'true');
});

document.addEventListener('click', (event) => {
  if (!settingsMenu.contains(event.target) && !settingsBtn.contains(event.target)) {
    settingsMenu.classList.remove('show');
    settingsBtn.setAttribute('aria-expanded', 'false');
    settingsMenu.setAttribute('aria-hidden', 'true');
  }
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    settingsMenu.classList.remove('show');
    settingsBtn.setAttribute('aria-expanded', 'false');
    settingsMenu.setAttribute('aria-hidden', 'true');
  }
});

searchInput.addEventListener('input', renderList);
$('goat-search-form').addEventListener('submit', (event) => event.preventDefault());

renderProfile();
loadMovies();
