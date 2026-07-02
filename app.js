/* =============================================
   GOATCINE — App Logic
   ============================================= */

// ---- AUTH + PROFILE GUARD ----
// Sem token → login | Sem perfil → escolher/criar perfil
(function authProfileGuard() {
  const token   = localStorage.getItem('goatcine_token');
  const profile = localStorage.getItem('goatcine_profile');

  if (!token) {
    window.location.replace('/login.html');
    return;
  }
  if (!profile) {
    window.location.replace('/profiles.html');
    return;
  }
})();

// Top 10, Hero Slides e Categoria de Filmes carregadas dinamicamente da API
let MOVIES = {
  recommended: [],
  trending: [],
  top10: [],
  releases: [],
  new: [],
  because: [],
  genre: [],
  popular: [],
  action: [],
  series: []
};
let ALL_CATALOG = [];
let TOP10_MOVIES = [];
let TOP10_SERIES = [];
let HERO_SLIDES = [];
const SERIES_EPISODES_CACHE = new Map();

// ---- STATE ----
let currentHeroSlide = 0;
let heroInterval = null;
let myList = new Set();
let isSearchOpen = false;
let currentModalMovie = null;
let activeView = 'home';
let currentCatalogType = 'movies';

function getViewFromPath() {
  const path = window.location.pathname.replace(/\/+$/, '') || '/';
  if (path === '/filmes') return 'movies';
  if (path === '/series') return 'series';
  return 'home';
}

function getPathForView(viewName) {
  if (viewName === 'movies') return '/filmes';
  if (viewName === 'series') return '/series';
  return '/';
}

function navigateToView(viewName) {
  const nextPath = getPathForView(viewName);
  if (window.location.pathname !== nextPath) {
    window.history.pushState({ viewName }, '', nextPath);
  }
  showSection(viewName);
}

// ---- DOM REFS ----
const $ = (id) => document.getElementById(id);
const navbar = $('navbar');
const searchBar = $('search-bar');
const searchBtn = $('nav-search-btn');
const searchInput = $('search-input');
const searchClose = $('search-close');
const modalOverlay = $('modal-overlay');
const modal = $('modal');
const modalClose = $('modal-close');
const toast = $('toast');
const heroTitle = $('hero-title');
const heroBadge = $('hero-badge');
const heroMeta = $('hero-meta');
const heroDesc = $('hero-desc');
const heroBg = $('hero-bg');
const heroParticles = $('hero-particles');

function getActiveProfileId() {
  try {
    const profile = JSON.parse(localStorage.getItem('goatcine_profile') || 'null');
    return profile?.id || 'default';
  } catch {
    return 'default';
  }
}

function getMyListKey() {
  return `goatcine_my_list_${getActiveProfileId()}`;
}

function loadMyList() {
  try {
    myList = new Set(JSON.parse(localStorage.getItem(getMyListKey()) || '[]').map(String));
  } catch {
    myList = new Set();
  }
}

function saveMyList() {
  localStorage.setItem(getMyListKey(), JSON.stringify(Array.from(myList)));
}

function toggleMyListItem(movie) {
  if (!movie?.id) return false;
  const id = String(movie.id);

  if (myList.has(id)) {
    myList.delete(id);
    saveMyList();
    showToast(`Removido da sua lista`);
    return false;
  }

  myList.add(id);
  saveMyList();
  showToast(`${movie.title} adicionado a Minha lista`);
  return true;
}

const WATCHED_EPISODES_PREFIX = 'goatcine_watched_episodes_';

function getWatchedEpisodesKey() {
  return `${WATCHED_EPISODES_PREFIX}${getActiveProfileId()}`;
}

function readWatchedEpisodes() {
  try {
    const saved = JSON.parse(localStorage.getItem(getWatchedEpisodesKey()) || '[]');
    return Array.isArray(saved) ? new Set(saved.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeWatchedEpisodes(watchedSet) {
  localStorage.setItem(getWatchedEpisodesKey(), JSON.stringify(Array.from(watchedSet)));
}

function markEpisodeAsWatched(episodeId) {
  const watched = readWatchedEpisodes();
  watched.add(String(episodeId));
  writeWatchedEpisodes(watched);
}

const WATCH_PROGRESS_PREFIX = 'goatcine_watch_progress_';
const WATCH_HISTORY_PREFIX = 'goatcine_watch_history_';
let continueWatchingRenderTimer = null;

function getWatchProgressKey() {
  return `${WATCH_PROGRESS_PREFIX}${getActiveProfileId()}`;
}

function readWatchProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(getWatchProgressKey()) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function writeWatchProgress(progress) {
  localStorage.setItem(getWatchProgressKey(), JSON.stringify(progress));
}

function getWatchHistoryKey() {
  return `${WATCH_HISTORY_PREFIX}${getActiveProfileId()}`;
}

function readWatchHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(getWatchHistoryKey()) || '[]');
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function writeWatchHistory(history) {
  localStorage.setItem(getWatchHistoryKey(), JSON.stringify(history.slice(0, 80)));
}

function recordWatchHistory(item, currentTime = 0, durationSeconds = 0, completed = false) {
  const progressId = getProgressId(item);
  if (!progressId || !item?.title) return;

  const history = readWatchHistory().filter(entry => entry.progressId !== progressId);
  history.unshift({
    progressId,
    id: item.seriesId || item.movieId || item.id,
    episodeId: item.episodeId || null,
    type: item.episodeId ? 'episode' : (item.type === 'series' ? 'series' : 'movie'),
    title: item.seriesTitle || item.title,
    playbackTitle: item.title,
    poster: item.parentPoster || item.poster || '',
    backdrop: item.parentBackdrop || item.backdrop || '',
    genre: item.genre || '',
    year: item.year || '',
    rating: item.rating || '',
    duration: item.duration || '',
    currentTime: Number(currentTime) || 0,
    durationSeconds: Number(durationSeconds) || 0,
    completed: Boolean(completed),
    watchedAt: Date.now()
  });
  writeWatchHistory(history);
}

function getProgressId(item) {
  if (!item) return '';
  if (item.progressId) return String(item.progressId);
  if (item.episodeId) return `episode:${item.episodeId}`;
  const id = item.movieId || item.seriesId || item.id;
  return id ? `movie:${id}` : '';
}

function scheduleContinueWatchingRender() {
  clearTimeout(continueWatchingRenderTimer);
  continueWatchingRenderTimer = setTimeout(renderContinueWatching, 350);
}

function saveWatchProgress(item, currentTime, durationSeconds) {
  const progressId = getProgressId(item);
  const totalSeconds = Number(durationSeconds) || 0;
  const watchedSeconds = Number(currentTime) || 0;

  if (!progressId || !totalSeconds || watchedSeconds < 5) return;

  const progress = readWatchProgress();
  const isAlmostFinished = watchedSeconds >= totalSeconds - 20 || watchedSeconds / totalSeconds >= 0.95;
  const isEpisode = Boolean(item.episodeId);

  recordWatchHistory(item, watchedSeconds, totalSeconds, isAlmostFinished);

  if (isAlmostFinished) {
    if (isEpisode && item.episodeId) {
      markEpisodeAsWatched(item.episodeId);
    }
    if (progress[progressId]) {
      delete progress[progressId];
      writeWatchProgress(progress);
      scheduleContinueWatchingRender();
    }
    return;
  }

  const movieId = item.seriesId || item.movieId || item.id;
  const episodeLabel = isEpisode
    ? `T${item.season || 1}:E${item.episodeNumber || item.number || 1} ${item.episodeTitle || ''}`.trim()
    : '';

  progress[progressId] = {
    id: progressId,
    type: isEpisode ? 'episode' : (item.type === 'series' ? 'series' : 'movie'),
    movieId,
    episodeId: item.episodeId || null,
    season: item.season || null,
    episodeNumber: item.episodeNumber || item.number || null,
    episodeTitle: item.episodeTitle || '',
    seriesTitle: item.seriesTitle || '',
    title: isEpisode ? (item.seriesTitle || item.title) : item.title,
    playbackTitle: item.title,
    subtitle: isEpisode ? episodeLabel : [item.year, item.genre].filter(Boolean).join(' · '),
    poster: item.parentPoster || item.poster || '',
    backdrop: item.parentBackdrop || item.backdrop || '',
    rating: item.rating || '',
    year: item.year || '',
    genre: item.genre || '',
    desc: item.desc || '',
    videoUrl: item.videoUrl || item.videourl || '',
    subtitlesUrl: item.subtitlesUrl || item.subtitlesurl || '',
    durationLabel: item.duration || '',
    durationSeconds: totalSeconds,
    currentTime: watchedSeconds,
    updatedAt: Date.now()
  };

  const limitedProgress = Object.fromEntries(
    Object.entries(progress)
      .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
      .slice(0, 24)
  );

  writeWatchProgress(limitedProgress);
  scheduleContinueWatchingRender();
}

function clearWatchProgress(item) {
  const progressId = getProgressId(item);
  if (!progressId) return;

  const progress = readWatchProgress();
  if (!progress[progressId]) return;

  delete progress[progressId];
  writeWatchProgress(progress);
  scheduleContinueWatchingRender();
}

function markPlaybackCompleted(item) {
  if (!item) return;

  recordWatchHistory(item, item.durationSeconds || 0, item.durationSeconds || 0, true);

  if (item.episodeId) {
    markEpisodeAsWatched(item.episodeId);
  }

  clearWatchProgress(item);
}

function getSavedWatchProgress(item) {
  const progressId = getProgressId(item);
  if (!progressId) return null;
  return readWatchProgress()[progressId] || null;
}

function formatProgressTime(seconds) {
  const value = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}min`;
  return `${minutes}min`;
}

function buildPlaybackItemFromProgress(entry) {
  return {
    id: entry.movieId,
    movieId: entry.movieId,
    type: entry.type === 'episode' ? 'series' : entry.type,
    title: entry.playbackTitle || entry.title,
    year: entry.year,
    rating: entry.rating,
    genre: entry.genre,
    duration: entry.durationLabel,
    desc: entry.desc,
    poster: entry.poster,
    backdrop: entry.backdrop,
    videoUrl: entry.videoUrl,
    subtitlesUrl: entry.subtitlesUrl,
    progressId: entry.id,
    episodeId: entry.episodeId,
    season: entry.season,
    episodeNumber: entry.episodeNumber,
    episodeTitle: entry.episodeTitle,
    seriesTitle: entry.seriesTitle || entry.title,
    parentPoster: entry.poster,
    parentBackdrop: entry.backdrop
  };
}

function bindCardTouchScrollGuard(card) {
  card.addEventListener('touchcancel', () => {
    card.classList.remove('touch-active');
  }, { passive: true });
}

function initMobileSectionScrollFix() {
  if (document.documentElement.dataset.mobileSectionScrollFix === 'true') return;
  document.documentElement.dataset.mobileSectionScrollFix = 'true';
}

function createContinueWatchingCard(entry) {
  const card = document.createElement('div');
  const progressPct = Math.max(3, Math.min(100, ((entry.currentTime || 0) / (entry.durationSeconds || 1)) * 100));
  const title = entry.title || entry.playbackTitle || 'Continuar';
  const subtitle = entry.subtitle || '';

  card.className = 'movie-card continue-card fade-in';
  card.setAttribute('role', 'listitem');
  card.setAttribute('aria-label', `Continuar assistindo ${title}`);
  card.dataset.typeLabel = entry.type === 'episode' ? 'EPISODIO' : (entry.type === 'series' ? 'SERIE' : 'FILME');
  card.dataset.rating = entry.rating || '';

  card.innerHTML = `
    <div class="card-poster-wrapper continue-poster-wrap">
      <img class="card-poster"
           src="${entry.poster || entry.backdrop || ''}"
           alt="Poster de ${escapeHtml(title)}"
           loading="lazy"
           draggable="false"
           onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22180%22 height=%22270%22 viewBox=%220 0 180 270%22><rect width=%22180%22 height=%22270%22 fill=%22%23161616%22/></svg>'" />
      <div class="continue-progress-track" aria-hidden="true">
        <span style="width: ${progressPct}%"></span>
      </div>
      <div class="card-overlay">
        <div class="card-title">${escapeHtml(title)}</div>
        <div class="card-rating">${formatProgressTime(entry.currentTime)} assistidos</div>
      </div>
    </div>
    <div class="card-info">
      <div class="card-name">${escapeHtml(title)}</div>
      <div class="card-year">${escapeHtml(subtitle)}</div>
    </div>
  `;

  bindCardTouchScrollGuard(card);
  card.addEventListener('click', () => openVideoPlayer(buildPlaybackItemFromProgress(entry)));
  return card;
}

function renderContinueWatching() {
  const section = $('continue-watching-section');
  const carousel = $('continue-watching-carousel');
  if (!section || !carousel) return;

  const entries = Object.values(readWatchProgress())
    .filter(entry => entry?.videoUrl && entry.currentTime > 5 && entry.durationSeconds > 0)
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  section.classList.toggle('hidden', entries.length === 0);
  carousel.innerHTML = '';
  entries.forEach(entry => carousel.appendChild(createContinueWatchingCard(entry)));
}

function uniqueById(items) {
  return Array.from(new Map((items || []).filter(Boolean).map(item => [String(item.id), item])).values());
}

function getAllCatalog() {
  return uniqueById(ALL_CATALOG.length
    ? ALL_CATALOG
    : [
        ...MOVIES.recommended,
        ...MOVIES.trending,
        ...MOVIES.top10,
        ...MOVIES.releases,
        ...MOVIES.new,
        ...MOVIES.because,
        ...MOVIES.genre,
        ...MOVIES.popular,
        ...MOVIES.action,
        ...MOVIES.series
      ]);
}

function getPrimaryGenre(movie) {
  return String(movie?.genre || '').split('/')[0].trim();
}

function getFavoriteGenreFromHistory() {
  const counts = new Map();
  readWatchHistory().forEach((entry) => {
    String(entry.genre || '').split('/').map(g => g.trim()).filter(Boolean).forEach((genre) => {
      counts.set(genre, (counts.get(genre) || 0) + 1);
    });
  });
  return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
}

function getMyListItems() {
  loadMyList();
  const all = getAllCatalog();
  return all.filter(item => myList.has(String(item.id)));
}

function takeLoop(items, count = 8) {
  const source = uniqueById(items);
  if (source.length <= count) return source;
  return source.slice(0, count);
}

function buildGenreCollection(all) {
  const byGenre = new Map();
  all.forEach((movie) => {
    String(movie.genre || '').split('/').map(g => g.trim()).filter(Boolean).forEach((genre) => {
      if (!byGenre.has(genre)) byGenre.set(genre, []);
      byGenre.get(genre).push(movie);
    });
  });

  return Array.from(byGenre.entries())
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8)
    .map(([genre, movies]) => ({
      ...movies.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0))[0],
      homeBadge: genre
    }));
}

function buildPremiumCollections() {
  const all = getAllCatalog();
  const movies = all.filter(item => item.type !== 'series');
  const series = all.filter(item => item.type === 'series');
  const byRating = [...all].sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
  const byYear = [...movies].sort((a, b) => Number(b.year || 0) - Number(a.year || 0));
  const newest = MOVIES.new.length ? MOVIES.new : byYear;
  const favoriteGenre = getFavoriteGenreFromHistory();
  const history = readWatchHistory();
  const lastWatched = history[0];
  const becauseSource = favoriteGenre
    ? all.filter(item => String(item.genre || '').includes(favoriteGenre))
    : byRating;
  const top10Source = MOVIES.top10.length ? MOVIES.top10 : TOP10_MOVIES;
  const recommended = uniqueById([
    ...getMyListItems(),
    ...becauseSource,
    ...byRating
  ]);

  return [
    {
      id: 'recommended-row',
      title: 'Recomendados para Você',
      items: takeLoop(MOVIES.recommended.length ? MOVIES.recommended : recommended, 8)
    },
    {
      id: 'filmes',
      title: 'Em Alta Hoje',
      items: takeLoop(MOVIES.trending.length ? MOVIES.trending : byRating, 8)
    },
    {
      id: 'top10-brasil',
      title: 'Top 10 Brasil',
      items: takeLoop((top10Source.length ? top10Source : byRating).map((movie, index) => ({
        ...movie,
        homeRank: index + 1
      })), 10)
    },
    {
      id: 'lancamentos',
      title: 'Lançamentos',
      items: takeLoop(MOVIES.releases.length ? MOVIES.releases : byYear, 8)
    },
    {
      id: 'novidades',
      title: 'Adicionados Recentemente',
      items: takeLoop(newest, 8)
    },
    {
      id: 'because-row',
      title: lastWatched?.title ? `Porque você assistiu ${lastWatched.title}` : 'Porque você assistiu...',
      items: takeLoop(MOVIES.because.length ? MOVIES.because : becauseSource, 8)
    },
    {
      id: 'genre-row',
      title: 'Por gênero',
      items: MOVIES.genre.length ? takeLoop(MOVIES.genre, 8) : buildGenreCollection(all)
    },
    {
      id: 'popular-row',
      title: 'Mais Populares',
      items: takeLoop(MOVIES.popular.length ? MOVIES.popular : byRating, 8)
    },
    {
      id: 'series',
      title: 'Séries em destaque',
      items: takeLoop(series.length ? series : byRating, 8)
    },
    {
      id: 'weekly-trends',
      title: 'Tendências da Semana',
      items: takeLoop(MOVIES.action.length ? MOVIES.action : uniqueById([...MOVIES.trending, ...newest, ...byRating]), 8)
    }
  ].filter(row => row.items.length > 0);
}

function removeLegacyHomeRows() {
  ['filmes', 'novidades', 'series', 'top10-movies', 'top10-series'].forEach((id) => {
    const element = $(id);
    if (element && !element.closest('#premium-rows')) element.remove();
  });

  const actionSection = $('carousel-action')?.closest('.row-section');
  if (actionSection) actionSection.remove();
}

function renderHomeSkeletons() {
  const premiumRows = $('premium-rows');
  if (!premiumRows) return;

  premiumRows.innerHTML = ['Recomendados para Você', 'Em Alta Hoje', 'Top 10 Brasil'].map((title, rowIndex) => `
    <section class="row-section premium-row" aria-label="${title}">
      <div class="row-header">
        <h2 class="row-title">${title}</h2>
      </div>
      <div class="carousel-wrapper">
        <div class="carousel premium-carousel" role="list" aria-busy="true">
          ${Array.from({ length: 8 }).map((_, index) => `
            <div class="movie-card skeleton-card" role="listitem" style="animation-delay:${(rowIndex + index) * 35}ms">
              <span></span>
            </div>
          `).join('')}
        </div>
      </div>
    </section>
  `).join('');
}

function createPremiumRow(row) {
  const section = document.createElement('section');
  section.className = 'row-section premium-row';
  section.id = row.id;
  section.setAttribute('aria-label', row.title.replace(/[^\p{L}\p{N}\s]/gu, '').trim() || row.title);

  const leftId = `${row.id}-left`;
  const rightId = `${row.id}-right`;
  const carouselId = `${row.id}-carousel`;

  section.innerHTML = `
    <div class="row-header">
      <h2 class="row-title">${escapeHtml(row.title)}</h2>
      <button class="row-see-all premium-see-all" type="button">Ver Todos</button>
    </div>
    <div class="carousel-wrapper">
      <button class="carousel-arrow left" id="${leftId}" type="button" aria-label="Anterior">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="15,18 9,12 15,6"/>
        </svg>
      </button>
      <div class="carousel premium-carousel" id="${carouselId}" role="list" tabindex="0"></div>
      <button class="carousel-arrow right" id="${rightId}" type="button" aria-label="Próximo">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="9,18 15,12 9,6"/>
        </svg>
      </button>
    </div>
  `;

  const carousel = section.querySelector('.premium-carousel');
  row.items.forEach(item => carousel.appendChild(createMovieCard(item)));

  const scrollCarousel = (direction) => {
    const amount = Math.max(320, Math.floor(carousel.clientWidth * 0.82));
    carousel.scrollBy({ left: amount * direction, behavior: 'smooth' });
  };

  section.querySelector(`#${leftId}`).addEventListener('click', () => scrollCarousel(-1));
  section.querySelector(`#${rightId}`).addEventListener('click', () => scrollCarousel(1));
  carousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollCarousel(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollCarousel(1);
    }
  });

  section.querySelector('.premium-see-all').addEventListener('click', () => {
    const grid = $('catalog-grid');
    const catalogSection = $('catalog-section');
    const standardContent = $('standard-content');
    const heroSection = $('hero');
    const title = $('catalog-title');
    if (!grid || !catalogSection || !standardContent || !title) return;

    activeView = 'home';
    standardContent.classList.add('hidden');
    if (heroSection) heroSection.style.display = 'none';
    catalogSection.classList.remove('hidden');
    title.textContent = row.title;
    const filter = $('catalog-genre-filter');
    if (filter) filter.innerHTML = '<option value="all">Todos os títulos</option>';
    grid.innerHTML = '';
    row.items.forEach(item => grid.appendChild(createMovieCard(item)));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  return section;
}

function renderPremiumHomeRows() {
  removeLegacyHomeRows();
  const premiumRows = $('premium-rows');
  if (!premiumRows) return;

  const collections = buildPremiumCollections();
  premiumRows.innerHTML = '';
  collections.forEach(row => premiumRows.appendChild(createPremiumRow(row)));
}

// ---- INIT ----
async function initApp() {
  createParticles();
  loadMyList();
  removeLegacyHomeRows();
  renderHomeSkeletons();

  try {
    const res = await fetch('/api/movies');
    if (!res.ok) throw new Error('Erro ao carregar catálogo');
    const data = await res.json();
    const list = (data.movies || []).map(m => ({
      ...m,
      type: m.type === 'series' ? 'series' : 'movie',
      videoUrl: m.videoUrl || m.videourl || '',
      trailerUrl: m.trailerUrl || m.trailerurl || ''
    }));

    const movieList = list.filter(m => m.type !== 'series');
    const seriesList = list.filter(m => m.type === 'series');
    ALL_CATALOG = [...movieList, ...seriesList];

    // Organizar filmes por categorias e séries em uma prateleira própria
    MOVIES.recommended = list.filter(m => m.category === 'recommended');
    MOVIES.trending = list.filter(m => m.category === 'trending');
    MOVIES.top10 = list.filter(m => m.category === 'top10_movies').sort((a, b) => a.position - b.position);
    MOVIES.releases = list.filter(m => m.category === 'releases');
    MOVIES.new = list.filter(m => m.category === 'new');
    MOVIES.because = list.filter(m => m.category === 'because');
    MOVIES.genre = list.filter(m => m.category === 'genre');
    MOVIES.popular = list.filter(m => m.category === 'popular');
    MOVIES.action = list.filter(m => m.category === 'action');
    MOVIES.series = seriesList.filter(m => m.category === 'series');
    if (MOVIES.series.length === 0) MOVIES.series = seriesList;

    // Gerar Top 10 dinâmico para Filmes e Séries (respeitando ordenação manual se houver)
    TOP10_MOVIES = MOVIES.top10;
    if (TOP10_MOVIES.length === 0) {
      TOP10_MOVIES = [...movieList].sort((a, b) => b.rating - a.rating).slice(0, 10);
    }
    TOP10_SERIES = seriesList.filter(m => m.category === 'top10_series').sort((a, b) => a.position - b.position);
    if (TOP10_SERIES.length === 0) {
      TOP10_SERIES = [...seriesList].sort((a, b) => b.rating - a.rating).slice(0, 10);
    }

    // Gerar Hero Slides com filmes e series melhor avaliados
    const candidates = [...movieList, ...seriesList].sort((a, b) => b.rating - a.rating);
    HERO_SLIDES = candidates.slice(0, 5).map(m => ({
      title: m.title,
      year: m.year,
      duration: m.type === 'series' ? 'Serie' : m.duration,
      rating: m.rating,
      genre: m.genre,
      desc: m.desc,
      backdrop: m.backdrop || m.poster,
      movieId: m.id
    }));

    if (HERO_SLIDES.length === 0) {
      HERO_SLIDES.push({
        title: "GOATCINE",
        year: 2026,
        duration: "0",
        rating: 10,
        genre: "Premium",
        desc: "Bem-vindo ao GOATCINE! Adicione filmes pelo painel administrativo para ver o catálogo carregado.",
        backdrop: "",
        movieId: 0
      });
    }

  } catch (err) {
    console.error('[LOAD CATALOGUE ERROR]', err);
    showToast('⚠️ Erro ao conectar com o catálogo de filmes.');
  }

  renderPremiumHomeRows();
  renderTop10();
  renderContinueWatching();
  initMobileSectionScrollFix();
  refreshTop10SlideButtons();
  initCarouselArrows();
  initHeroSlider();
  initNavbar();
  showSection(getViewFromPath(), { skipScroll: true });
  initSearch();
  applyPendingSearch();
  initModal();
  initHeroButtons();
  initSeeAllButtons();
  initVideoPlayer();
}

// ---- PARTICLES ----
function createParticles() {
  for (let i = 0; i < 22; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random() * 3 + 1;
    p.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 12 + 8}s;
      animation-delay: ${Math.random() * 10}s;
      --drift: ${(Math.random() - 0.5) * 120}px;
      opacity: 0;
    `;
    heroParticles.appendChild(p);
  }
}

// ---- MOVIE CARD RENDER ----
function createMovieCard(movie) {
  const card = document.createElement('div');
  card.className = 'movie-card fade-in';
  card.setAttribute('role', 'listitem');
  card.tabIndex = 0;
  card.setAttribute('aria-label', `${movie.title} (${movie.year}) - Avaliação: ${movie.rating}`);
  card.dataset.id = movie.id;
  card.dataset.typeLabel = movie.type === 'series' ? 'SERIE' : 'FILME';
  card.dataset.rating = movie.rating || '';
  if (movie.homeRank) card.dataset.rank = movie.homeRank;

  const isInList = myList.has(String(movie.id));
  const poster = movie.poster || movie.backdrop || '';

  card.innerHTML = `
    <div class="card-poster-wrapper">
      ${movie.homeRank ? `<span class="card-rank-badge">#${movie.homeRank}</span>` : ''}
      ${movie.homeBadge ? `<span class="card-genre-badge">${escapeHtml(movie.homeBadge)}</span>` : ''}
      <img class="card-poster" 
           src="${poster}" 
           alt="Poster de ${escapeHtml(movie.title)}"
           loading="lazy"
           decoding="async"
           draggable="false"
           onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22180%22 height=%22270%22 viewBox=%220 0 180 270%22><rect width=%22180%22 height=%22270%22 fill=%22%23161616%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%23FFD700%22 font-size=%2240%22>🎬</text></svg>'" />
      <div class="card-overlay">
        <div class="card-title">${escapeHtml(movie.title)}</div>
        <div class="card-hover-actions" aria-label="Ações de ${escapeHtml(movie.title)}">
          <button class="card-action watch" type="button" data-card-action="watch" aria-label="Assistir ${escapeHtml(movie.title)}">▶ Assistir</button>
          <button class="card-action list ${isInList ? 'active' : ''}" type="button" data-card-action="list" aria-label="Adicionar ${escapeHtml(movie.title)} à minha lista">${isInList ? '✓' : '➕'}</button>
          <button class="card-action info" type="button" data-card-action="info" aria-label="Mais informações sobre ${escapeHtml(movie.title)}">ℹ</button>
        </div>
      </div>
    </div>
    <div class="card-info">
      <div class="card-name">${escapeHtml(movie.title)}</div>
      <div class="card-year">${escapeHtml(movie.year || '')} · ${escapeHtml(movie.genre || typeLabel)}</div>
    </div>
  `;

  bindCardTouchScrollGuard(card);

  function handleAction(action, targetButton) {
    if (action === 'watch') {
      if (movie.type === 'series') {
        openModal(movie);
      } else {
        openVideoPlayer(movie);
      }
      return;
    }

    if (action === 'list') {
      const active = toggleMyListItem(movie);
      targetButton.classList.toggle('active', active);
      targetButton.textContent = active ? '✓' : '➕';
      return;
    }

    openModal(movie);
  }

  card.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-card-action]');
    if (actionButton) {
      event.stopPropagation();
      handleAction(actionButton.dataset.cardAction, actionButton);
      return;
    }

    if (window.matchMedia('(hover: none)').matches && !card.classList.contains('touch-active')) {
      document.querySelectorAll('.movie-card.touch-active').forEach(item => item.classList.remove('touch-active'));
      card.classList.add('touch-active');
      return;
    }

    openModal(movie);
  });

  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openModal(movie);
    }
  });

  return card;
}

// ---- CAROUSEL RENDER ----
function renderCarousel(carouselId, movies) {
  const carousel = $(carouselId);
  if (!carousel) return;
  carousel.innerHTML = '';
  movies.forEach(m => carousel.appendChild(createMovieCard(m)));
}

// ---- TOP 10 ----
function createTop10Card(movie, idx) {
  const card = document.createElement('div');
  card.className = 'top10-card';
  card.setAttribute('role', 'listitem');
  card.setAttribute('aria-label', `#${idx + 1} ${movie.title}`);
  card.innerHTML = `
    <div class="top10-number">${idx + 1}</div>
    <img class="top10-poster" 
         src="${movie.poster}" 
         alt="Poster do filme ${movie.title}"
         loading="lazy"
         onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 viewBox=%220 0 200 300%22><rect width=%22200%22 height=%22300%22 fill=%22%23161616%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%23FFD700%22 font-size=%2248%22>🎬</text></svg>'" />
    <div class="top10-overlay">
      <div class="top10-title">${movie.title}</div>
      <div class="top10-rating">⭐ ${movie.rating}</div>
    </div>
  `;
  card.addEventListener('click', () => openModal(movie));
  return card;
}

function renderTop10() {
  const moviesGrid = $('top10-movies-grid');
  const seriesGrid = $('top10-series-grid');

  if (moviesGrid) {
    moviesGrid.innerHTML = '';
    moviesGrid.dataset.top10Index = '0';
    TOP10_MOVIES.forEach((movie, idx) => {
      moviesGrid.appendChild(createTop10Card(movie, idx));
    });
  }

  if (seriesGrid) {
    seriesGrid.innerHTML = '';
    seriesGrid.dataset.top10Index = '0';
    TOP10_SERIES.forEach((series, idx) => {
      seriesGrid.appendChild(createTop10Card(series, idx));
    });
  }
}

function slideTop10Grid(grid, direction = 1) {
  if (!grid) return;
  const cards = Array.from(grid.querySelectorAll('.top10-card'));
  if (cards.length === 0) return;

  const currentIndex = parseInt(grid.dataset.top10Index || '0', 10) || 0;
  const step = direction < 0 ? -4 : 4;
  const nextIndex = (currentIndex + step + cards.length) % cards.length;
  grid.dataset.top10Index = String(nextIndex);

  const targetLeft = cards[nextIndex].offsetLeft;
  animateTop10Scroll(grid, targetLeft);
}

function animateTop10Scroll(grid, targetLeft) {
  const startLeft = grid.scrollLeft;
  const maxLeft = grid.scrollWidth - grid.clientWidth;
  const endLeft = Math.max(0, Math.min(targetLeft, maxLeft));
  const distance = endLeft - startLeft;
  const duration = 720;
  const startedAt = performance.now();

  if (grid._top10ScrollAnimation) {
    cancelAnimationFrame(grid._top10ScrollAnimation);
  }

  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

  const tick = (now) => {
    const elapsed = now - startedAt;
    const progress = Math.min(elapsed / duration, 1);
    grid.scrollLeft = startLeft + distance * easeOutCubic(progress);

    if (progress < 1) {
      grid._top10ScrollAnimation = requestAnimationFrame(tick);
    } else {
      grid._top10ScrollAnimation = null;
    }
  };

  grid._top10ScrollAnimation = requestAnimationFrame(tick);
}

window.slideTop10ById = function(gridId, direction = 1) {
  slideTop10Grid($(gridId), direction);
};

function refreshTop10SlideButtons() {
  document.querySelectorAll('.top10-slide-btn').forEach((button) => {
    const gridId = button.getAttribute('onclick')?.match(/'([^']+)'/)?.[1];
    const grid = gridId ? $(gridId) : null;
    button.hidden = !grid || grid.querySelectorAll('.top10-card').length <= 4;
  });
}
// ---- CAROUSEL ARROWS ----
function initCarouselArrows() {
  const pairs = [
    ['arrow-left-continue', 'arrow-right-continue', 'continue-watching-carousel'],
    ['arrow-left-0', 'arrow-right-0', 'carousel-trending'],
    ['arrow-left-1', 'arrow-right-1', 'carousel-new'],
    ['arrow-left-2', 'arrow-right-2', 'carousel-action'],
    ['arrow-left-3', 'arrow-right-3', 'carousel-series'],
  ];

  pairs.forEach(([leftId, rightId, carouselId]) => {
    const left = $(leftId);
    const right = $(rightId);
    const carousel = $(carouselId);
    if (!left || !right || !carousel) return;

    const scrollAmount = 600;
    left.addEventListener('click', () => carousel.scrollBy({ left: -scrollAmount, behavior: 'smooth' }));
    right.addEventListener('click', () => carousel.scrollBy({ left: scrollAmount, behavior: 'smooth' }));
  });
}

// ---- HERO SLIDER ----
function cssUrl(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function updateHeroSlide(idx) {
  const slide = HERO_SLIDES[idx];
  if (!slide) return;
  const backdrop = slide.backdrop || '';

  // Update background with the horizontal backdrop from the current title.
  heroBg.style.backgroundImage = backdrop
    ? `
      linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.62) 34%, rgba(0,0,0,0.22) 68%, rgba(0,0,0,0.6) 100%),
      linear-gradient(to top, #000 0%, rgba(0,0,0,0.72) 13%, rgba(0,0,0,0.16) 45%, rgba(0,0,0,0.22) 100%),
      url("${cssUrl(backdrop)}")
    `
    : 'linear-gradient(135deg, #050505 0%, #101010 55%, #000 100%)';
  heroBg.style.backgroundSize = 'cover, cover, cover';
  heroBg.style.backgroundPosition = 'center center, center center, center 28%';
  heroBg.style.backgroundRepeat = 'no-repeat';

  // Animate content
  const content = document.querySelector('.hero-content');
  content.style.opacity = '0';
  content.style.transform = 'translateY(12px)';

  setTimeout(() => {
    heroBadge.innerHTML = `<span class="badge-icon">•</span> EM DESTAQUE · ${String(idx + 1).padStart(2, '0')} / ${String(HERO_SLIDES.length).padStart(2, '0')}`;
    heroTitle.textContent = slide.title;
    heroMeta.innerHTML = `
      <span class="meta-rating">⭐ ${slide.rating}</span>
      <span class="meta-sep">·</span>
      <span class="meta-year">${slide.year}</span>
      <span class="meta-sep">·</span>
      <span class="meta-duration">${slide.duration}</span>
      <span class="meta-sep">·</span>
      <span class="meta-genre">${slide.genre}</span>
    `;
    heroDesc.textContent = slide.desc;

    // Watch button
    const watchBtn = $('hero-watch-btn');
    if (watchBtn) watchBtn.dataset.movieId = slide.movieId;

    content.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    content.style.opacity = '1';
    content.style.transform = 'translateY(0)';
  }, 200);

  // Update indicators
  document.querySelectorAll('.indicator').forEach((ind, i) => {
    ind.classList.toggle('active', i === idx);
    ind.setAttribute('aria-pressed', i === idx ? 'true' : 'false');
  });

  currentHeroSlide = idx;
}

function initHeroSlider() {
  const indicators = $('hero-indicators');
  if (indicators) {
    indicators.innerHTML = HERO_SLIDES.map((_, i) => (
      `<button class="indicator ${i === 0 ? 'active' : ''}" id="indicator-${i}" aria-label="Slide ${i + 1}" aria-pressed="${i === 0 ? 'true' : 'false'}"></button>`
    )).join('');
  }

  updateHeroSlide(0);

  document.querySelectorAll('.indicator').forEach((ind, i) => {
    ind.addEventListener('click', () => {
      clearInterval(heroInterval);
      updateHeroSlide(i);
      heroInterval = setInterval(() => {
        updateHeroSlide((currentHeroSlide + 1) % HERO_SLIDES.length);
      }, 7000);
    });
  });

  heroInterval = setInterval(() => {
    updateHeroSlide((currentHeroSlide + 1) % HERO_SLIDES.length);
  }, 7000);
}

function initHeroButtons() {
  const watchBtn = $('hero-watch-btn');
  const listBtn = $('hero-list-btn');
  const infoBtn = $('hero-info-btn');

  if (watchBtn) {
    watchBtn.addEventListener('click', () => {
      const movie = findMovieById(HERO_SLIDES[currentHeroSlide].movieId);
      if (!movie) return;
      if (movie.type === 'series') {
        openModal(movie);
      } else {
        openVideoPlayer(movie);
      }
    });
  }

  if (listBtn) {
    listBtn.addEventListener('click', () => {
      toggleMyListItem(findMovieById(HERO_SLIDES[currentHeroSlide]?.movieId));
    });
  }

  if (infoBtn) {
    infoBtn.addEventListener('click', () => {
      const movie = findMovieById(HERO_SLIDES[currentHeroSlide].movieId);
      if (movie) openModal(movie);
    });
  }
}

// ---- NAVBAR ----
function syncNavActionsMount() {
  const navActions = $('nav-actions');
  const navContainer = document.querySelector('.nav-container');
  if (!navActions || !navContainer) return;

  if (isMobileViewport()) {
    if (navActions.parentElement !== document.body) {
      document.body.appendChild(navActions);
    }
    return;
  }

  if (navActions.parentElement !== navContainer) {
    navContainer.appendChild(navActions);
  }
}

function initNavbar() {
  syncNavActionsMount();
  window.addEventListener('resize', debounce(syncNavActionsMount, 120));
  window.addEventListener('orientationchange', () => setTimeout(syncNavActionsMount, 120));

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 60);
  });

  // Mobile hamburger
  const hamburger = $('nav-hamburger');
  const navLinks = $('nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const isOpen = navLinks.style.display === 'flex';
      navLinks.style.display = isOpen ? 'none' : 'flex';
      navLinks.style.flexDirection = 'column';
      navLinks.style.position = 'absolute';
      navLinks.style.top = '100%';
      navLinks.style.left = '0';
      navLinks.style.right = '0';
      navLinks.style.background = 'rgba(8,8,8,0.97)';
      navLinks.style.padding = '16px 24px';
      navLinks.style.borderTop = '1px solid rgba(255,215,0,0.2)';
      hamburger.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
    });
  }

  // Nav link router navigation click handlers
  $('nav-logo-link')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToView('home');
  });

  $('nav-home')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToView('home');
  });

  $('nav-movies')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToView('movies');
  });

  $('nav-series')?.addEventListener('click', (e) => {
    e.preventDefault();
    navigateToView('series');
  });

  document.querySelectorAll('.nav-category-link').forEach((link) => {
    link.addEventListener('click', (event) => {
      const view = link.dataset.view;
      if (!view) return;

      event.preventDefault();
      navigateToView(view);
    });
  });

  window.addEventListener('popstate', () => {
    showSection(getViewFromPath());
  });
}

// ---- SEARCH ----
function isMobileViewport() {
  return window.matchMedia('(max-width: 600px)').matches;
}

function performSearch(q) {
  const standardContent = $('standard-content');
  const searchResultsSection = $('search-results-section');
  const searchResultsGrid = $('search-results-grid');
  const catalogSection = $('catalog-section');
  const heroSection = $('hero');
  const clearBtn = $('search-pill-clear');
  const mobileSearchInput = $('mobile-search-input');

  if (!q) {
    if (clearBtn) clearBtn.classList.add('hidden');
    if (mobileSearchInput) mobileSearchInput.value = '';
    if (searchResultsSection) searchResultsSection.classList.add('hidden');
    if (searchResultsGrid) searchResultsGrid.innerHTML = '';
    
    // Retornar ao estado da activeView
    showSection(activeView);
    return;
  }

  if (clearBtn) clearBtn.classList.remove('hidden');
  if (standardContent) standardContent.classList.add('hidden');
  if (catalogSection) catalogSection.classList.add('hidden');
  if (heroSection) heroSection.style.display = 'none';
  if (searchResultsSection) {
    searchResultsSection.classList.remove('hidden');
    const resultsTitle = $('search-results-title');
    if (resultsTitle) {
      resultsTitle.innerHTML = `Resultados para: <strong style="color: var(--text-primary); font-weight: 700;">"${q}"</strong>`;
    }
  }

  // Filtrar todos os filmes
  const allMovies = getAllCatalog();
  
  // Remover duplicados
  const uniqueMovies = uniqueById(allMovies);

  const found = uniqueMovies.filter(m =>
    m.title.toLowerCase().includes(q.toLowerCase()) ||
    m.genre.toLowerCase().includes(q.toLowerCase()) ||
    (m.director && m.director.toLowerCase().includes(q.toLowerCase())) ||
    (m.cast && m.cast.toLowerCase().includes(q.toLowerCase()))
  );

  if (searchResultsGrid && found.length === 0) {
    searchResultsGrid.innerHTML = `
      <div class="search-empty-state">
        <span class="search-empty-icon" aria-hidden="true"></span>
        <strong>Nenhum resultado encontrado</strong>
        <small>Tente buscar por outro titulo, genero ou nome.</small>
      </div>
    `;
    return;
  }

  if (searchResultsGrid) {
    searchResultsGrid.innerHTML = '';
    found.forEach(movie => {
      searchResultsGrid.appendChild(createMovieCard(movie));
    });
  }
}

function initSearch() {
  const searchInput = $('search-input');
  const mobileSearchInput = $('mobile-search-input');
  const mobileSearchForm = $('mobile-home-search-form');
  const clearBtn = $('search-pill-clear');
  const searchContainer = $('nav-search-container');
  const searchPill = searchContainer?.querySelector('.search-pill');

  if (!searchInput && !mobileSearchInput) return;

  function syncSearchPlaceholder() {
    if (searchInput) {
      searchInput.placeholder = isMobileViewport()
        ? 'Busque filmes, series, animes...'
        : 'Titulos, gente, generos...';
    }
  }

  syncSearchPlaceholder();
  window.addEventListener('resize', syncSearchPlaceholder);

  if (searchPill) {
    searchPill.addEventListener('click', () => {
      setTimeout(() => searchInput?.focus(), 30);
    });
  }

  function runSearchFrom(input, value) {
    if (input !== searchInput && searchInput) searchInput.value = value;
    if (input !== mobileSearchInput && mobileSearchInput) mobileSearchInput.value = value;
    performSearch(value.trim());
  }

  searchInput?.addEventListener('input', debounce((e) => {
    runSearchFrom(searchInput, e.target.value);
  }, 300));

  mobileSearchInput?.addEventListener('input', debounce((e) => {
    runSearchFrom(mobileSearchInput, e.target.value);
  }, 300));

  mobileSearchForm?.addEventListener('click', () => {
    mobileSearchForm.classList.add('search-open');
    setTimeout(() => mobileSearchInput?.focus(), 40);
  });

  mobileSearchInput?.addEventListener('blur', () => {
    if (!mobileSearchInput.value.trim()) {
      mobileSearchForm?.classList.remove('search-open');
    }
  });

  mobileSearchForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    runSearchFrom(mobileSearchInput, mobileSearchInput?.value || '');
    mobileSearchInput?.blur();
  });

  // Limpar busca
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      if (searchInput) searchInput.value = '';
      if (mobileSearchInput) mobileSearchInput.value = '';
      mobileSearchForm?.classList.remove('search-open');
      performSearch('');
      searchInput?.focus();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (searchInput) searchInput.value = '';
      if (mobileSearchInput) mobileSearchInput.value = '';
      mobileSearchForm?.classList.remove('search-open');
      performSearch('');
      searchInput?.blur();
      mobileSearchInput?.blur();
    }
  });
}

function applyPendingSearch() {
  const pendingSearch = localStorage.getItem('goatcine_pending_search');
  const searchInput = $('search-input');
  const mobileSearchInput = $('mobile-search-input');
  if (!pendingSearch || (!searchInput && !mobileSearchInput)) return;

  localStorage.removeItem('goatcine_pending_search');
  if (searchInput) searchInput.value = pendingSearch;
  if (mobileSearchInput) mobileSearchInput.value = pendingSearch;
  performSearch(pendingSearch);
}

// ---- MODAL ----
function findMovieById(id) {
  const allMovies = getAllCatalog();
  return allMovies.find(m => m.id === id);
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function getSeasonLabel(season) {
  return `Temporada ${season}`;
}

function groupEpisodesBySeason(episodes) {
  const map = new Map();
  episodes.forEach(ep => {
    const season = Number(ep.season) || 1;
    if (!map.has(season)) map.set(season, []);
    map.get(season).push(ep);
  });
  return Array.from(map.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([season, items]) => ({
      season,
      episodes: items.sort((a, b) => Number(a.number) - Number(b.number))
    }));
}

function flattenSeriesEpisodes(seasons) {
  return (seasons || [])
    .flatMap(group => (group.episodes || []).map(ep => ({
      ...ep,
      season: Number(ep.season || group.season) || 1,
      number: Number(ep.number) || 1
    })))
    .sort((a, b) => (a.season - b.season) || (a.number - b.number));
}

function cacheSeriesSeasons(seriesId, seasons) {
  if (!seriesId || !Array.isArray(seasons)) return;
  SERIES_EPISODES_CACHE.set(String(seriesId), seasons);
}

async function getSeriesSeasons(seriesId) {
  if (!seriesId) return [];
  const key = String(seriesId);
  if (SERIES_EPISODES_CACHE.has(key)) return SERIES_EPISODES_CACHE.get(key);

  const res = await fetch(`/api/movies/${seriesId}/episodes`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erro ao carregar episodios');

  const seasons = data.seasons || groupEpisodesBySeason(data.episodes || []);
  cacheSeriesSeasons(seriesId, seasons);
  return seasons;
}

function getSeriesBaseMovie(seriesId, fallback = {}) {
  const movie = findMovieById(Number(seriesId) || seriesId);
  if (movie) return movie;

  return {
    ...fallback,
    id: seriesId || fallback.id || fallback.movieId,
    title: fallback.seriesTitle || fallback.title,
    poster: fallback.parentPoster || fallback.poster,
    backdrop: fallback.parentBackdrop || fallback.backdrop
  };
}

function buildEpisodePlaybackItem(seriesMovie, episode, seasons) {
  const season = Number(episode.season) || 1;
  const number = Number(episode.number) || 1;

  return {
    ...seriesMovie,
    title: `${seriesMovie.title} - T${season}:E${number} ${episode.title || ''}`.trim(),
    type: 'series',
    seriesId: seriesMovie.id,
    seriesTitle: seriesMovie.title,
    episodeId: episode.id,
    season,
    episodeNumber: number,
    episodeTitle: episode.title || '',
    parentPoster: seriesMovie.poster,
    parentBackdrop: seriesMovie.backdrop,
    duration: episode.duration || '',
    desc: episode.desc || seriesMovie.desc || '',
    videoUrl: episode.videoUrl || episode.videourl || '',
    subtitlesUrl: episode.subtitlesUrl || episode.subtitlesurl || '',
    seriesSeasons: seasons,
    seriesEpisodes: flattenSeriesEpisodes(seasons)
  };
}

async function enrichSeriesPlaybackItem(item) {
  if (!item?.episodeId) return item;
  const seriesId = item.seriesId || item.movieId || item.id;
  if (!seriesId) return item;

  let seasons = item.seriesSeasons;
  if (!seasons) {
    try {
      seasons = await getSeriesSeasons(seriesId);
    } catch (err) {
      console.warn('Nao foi possivel carregar a lista de episodios no player:', err);
      seasons = [];
    }
  }
  const baseMovie = getSeriesBaseMovie(seriesId, item);

  return {
    ...item,
    seriesId,
    seriesTitle: item.seriesTitle || baseMovie.title,
    parentPoster: item.parentPoster || baseMovie.poster,
    parentBackdrop: item.parentBackdrop || baseMovie.backdrop,
    seriesSeasons: seasons,
    seriesEpisodes: item.seriesEpisodes || flattenSeriesEpisodes(seasons)
  };
}

function findNextEpisode(item) {
  if (!item?.episodeId || !Array.isArray(item.seriesEpisodes)) return null;
  const episodes = item.seriesEpisodes;
  const index = episodes.findIndex(ep => String(ep.id) === String(item.episodeId));
  return index >= 0 ? episodes[index + 1] || null : null;
}

function formatSeconds(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

function renderSeason(seasonGroup, movie, seasons = []) {
  const episodeList = $('episode-list-user');
  if (!episodeList || !seasonGroup) return;

  const progress = readWatchProgress();
  const watchedSet = readWatchedEpisodes();

  episodeList.innerHTML = seasonGroup.episodes.map(ep => {
    const isWatched = watchedSet.has(String(ep.id));
    const progEntry = progress[`episode:${ep.id}`];
    const progressTime = Number(progEntry?.currentTime) || 0;
    const progressDuration = Number(progEntry?.durationSeconds) || 0;
    const hasProgress = !isWatched && progressTime > 0 && progressDuration > 0;
    
    let indicatorHtml = '';
    const statusClass = isWatched ? 'is-watched' : (hasProgress ? 'is-progress' : '');
    
    if (isWatched) {
      indicatorHtml = `<span class="episode-status-badge watched"><i class="fa-solid fa-circle-check"></i> Assistido</span>`;
    } else if (hasProgress) {
      const pct = Math.min(100, Math.max(0, (progressTime / progressDuration) * 100));
      indicatorHtml = `
        <div class="episode-progress-container">
          <div class="episode-progress-bar">
            <div class="episode-progress-fill" style="width: ${pct}%"></div>
          </div>
          <span class="episode-status-text">Parou em ${formatSeconds(progressTime)}</span>
        </div>
      `;
    }

    return `
      <button class="episode-card-user ${statusClass}" type="button" data-episode-id="${ep.id}">
        <span class="episode-number-user">${ep.number}</span>
        <div style="flex: 1; text-align: left; display: flex; flex-direction: column; gap: 4px;">
          <span class="episode-name-user">${escapeHtml(ep.title)}</span>
          <span class="episode-desc-user">${escapeHtml(ep.desc || 'Sem descrição disponível.')}</span>
          ${indicatorHtml}
        </div>
        <span class="episode-duration-user">${escapeHtml(ep.duration)}</span>
      </button>
    `;
  }).join('');

  episodeList.querySelectorAll('.episode-card-user').forEach(card => {
    card.addEventListener('click', () => {
      const ep = seasonGroup.episodes.find(item => String(item.id) === card.dataset.episodeId);
      if (!ep) return;
      closeModal();
      openVideoPlayer(buildEpisodePlaybackItem(movie, { ...ep, season: ep.season || seasonGroup.season }, seasons));
    });
  });
}

async function loadSeriesEpisodes(movie) {
  const episodesSection = $('modal-episodes');
  const seasonTabs = $('season-tabs');
  const episodeList = $('episode-list-user');
  if (!episodesSection || !seasonTabs || !episodeList) return;

  episodesSection.hidden = false;
  seasonTabs.innerHTML = '';
  episodeList.innerHTML = '<div class="episode-desc-user">Carregando episodios...</div>';

  try {
    const res = await fetch(`/api/movies/${movie.id}/episodes`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao carregar episodios');
    if (currentModalMovie?.id !== movie.id) return;

    const seasons = data.seasons || groupEpisodesBySeason(data.episodes || []);
    cacheSeriesSeasons(movie.id, seasons);
    if (seasons.length === 0) {
      episodeList.innerHTML = '<div class="episode-desc-user">Nenhum episodio cadastrado ainda.</div>';
      return;
    }

    seasonTabs.innerHTML = seasons.map((group, index) => `
      <button class="season-tab ${index === 0 ? 'active' : ''}" type="button" data-season="${group.season}">
        ${getSeasonLabel(group.season)}
      </button>
    `).join('');

    seasonTabs.querySelectorAll('.season-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        seasonTabs.querySelectorAll('.season-tab').forEach(item => item.classList.remove('active'));
        tab.classList.add('active');
        const selected = seasons.find(group => String(group.season) === tab.dataset.season);
        renderSeason(selected, movie, seasons);
      });
    });

    renderSeason(seasons[0], movie, seasons);
  } catch (err) {
    console.error('[SERIES EPISODES ERROR]', err);
    episodeList.innerHTML = '<div class="episode-desc-user">Nao foi possivel carregar os episodios.</div>';
  }
}

function setModalDynamicBackground(imageUrl) {
  if (!modalOverlay) return;
  const url = imageUrl ? `url("${cssUrl(imageUrl)}")` : 'none';
  modalOverlay.classList.add('bg-swapping');
  window.setTimeout(() => {
    modalOverlay.style.setProperty('--modal-dynamic-bg', url);
    modalOverlay.classList.remove('bg-swapping');
  }, 80);
}

function openModal(movie) {
  currentModalMovie = movie;
  const modalTitle = $('modal-title');
  const modalDesc = $('modal-desc');
  const modalMeta = $('modal-meta');
  const modalBackdrop = $('modal-backdrop');
  const modalDetailList = $('modal-detail-list');
  const modalSimilarGrid = $('modal-similar-grid');
  const modalWatchBtn = $('modal-watch-btn');
  const modalListBtn = $('modal-list-btn');
  const modalTrailerBtn = $('modal-trailer-btn');
  const modalEpisodes = $('modal-episodes');
  const seasonTabs = $('season-tabs');
  const episodeList = $('episode-list-user');
  const isSeries = movie.type === 'series';

  if (modalEpisodes) modalEpisodes.hidden = true;
  if (seasonTabs) seasonTabs.innerHTML = '';
  if (episodeList) episodeList.innerHTML = '';

  // Set content
  setModalDynamicBackground(movie.backdrop || movie.poster);
  modalTitle.textContent = movie.title;
  modalDesc.textContent = movie.desc;
  modalBackdrop.src = movie.backdrop || movie.poster;
  modalBackdrop.alt = `Imagem de ${movie.title}`;

  modalMeta.innerHTML = `
    <span class="meta-rating">⭐ ${movie.rating}</span>
    <span class="meta-sep">·</span>
    <span class="meta-year">${movie.year}</span>
    <span class="meta-sep">·</span>
    ${isSeries ? '<span class="meta-duration">Serie</span>' : `<span class="meta-duration">${movie.duration}</span>`}
    <span class="meta-sep">·</span>
    <span class="meta-genre">${movie.genre}</span>
  `;

  modalDetailList.innerHTML = `
    <div class="detail-item">
      <span class="detail-label">Diretor</span>
      <span class="detail-value">${movie.director}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Elenco</span>
      <span class="detail-value">${movie.cast}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Gênero</span>
      <span class="detail-value">${movie.genre}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">Ano</span>
      <span class="detail-value">${movie.year}</span>
    </div>
    <div class="detail-item">
      <span class="detail-label">${isSeries ? 'Tipo' : 'Duração'}</span>
      <span class="detail-value">${isSeries ? 'Serie' : movie.duration}</span>
    </div>
  `;

  // Similar movies
  const allMovies = getAllCatalog();
  const similar = allMovies.filter(m => m.id !== movie.id && (
    m.genre.split('/')[0].trim() === movie.genre.split('/')[0].trim() ||
    m.category === movie.category
  )).slice(0, 4);

  modalSimilarGrid.innerHTML = '';
  similar.forEach(m => {
    const card = document.createElement('div');
    card.className = 'similar-card';
    card.innerHTML = `
      <img src="${m.poster}" alt="${m.title}" loading="lazy"
           onerror="this.onerror=null; this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22><rect width=%22200%22 height=%22300%22 fill=%22%23161616%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%23FFD700%22 font-size=%2248%22>🎬</text></svg>'" />
      <div class="similar-card-name">${m.title}</div>
    `;
    card.addEventListener('click', () => openModal(m));
    modalSimilarGrid.appendChild(card);
  });

  // Watch & List buttons
  modalWatchBtn.style.display = isSeries ? 'none' : 'inline-flex';
  if (!isSeries) {
    modalWatchBtn.onclick = () => {
      closeModal();
      openVideoPlayer(movie);
    };
  }

  modalListBtn.onclick = () => {
    toggleMyListItem(movie);
  };

  const trailerUrl = movie.trailerUrl || movie.trailerurl || '';
  if (modalTrailerBtn) {
    modalTrailerBtn.style.display = trailerUrl ? 'inline-flex' : 'none';
    modalTrailerBtn.onclick = trailerUrl ? () => {
      closeModal();
      openVideoPlayer({
        ...movie,
        title: `${movie.title} - Trailer`,
        videoUrl: trailerUrl,
        subtitlesUrl: '',
        isTrailer: true
      });
    } : null;
  }

  // Show modal
  modalOverlay.classList.add('open');
  modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modal.scrollTop = 0;

  if (isSeries) {
    loadSeriesEpisodes(movie);
  }
}

function closeModal() {
  modalOverlay.classList.remove('open');
  modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  currentModalMovie = null;
}

// =============================================
//  PREMIUM CUSTOM VIDEO PLAYER LOGIC
// =============================================
let controlsTimeout;
let isSpeedMenuOpen = false;

function initVideoPlayer() {
  const playerOverlay = $('player-overlay');
  const video = $('video-element');
  const iframeWrapper = $('iframe-element-wrapper');
  const iframe = $('iframe-element');
  const playPauseBtn = $('ctrl-play-pause');
  const rewindBtn = $('ctrl-rewind');
  const forwardBtn = $('ctrl-forward');
  const volumeBtn = $('ctrl-volume');
  const volumeSlider = $('volume-slider');
  const progressContainer = $('progress-container');
  const progressHover = $('progress-bar-hover');
  const progressFill = $('progress-bar-fill');
  const progressHandle = $('progress-bar-handle');
  const timeCurrent = $('time-current');
  const timeDuration = $('time-duration');
  const speedBtn = $('ctrl-speed');
  const speedMenu = $('speed-menu');
  const fullscreenBtn = $('ctrl-fullscreen');
  const subtitlesBtn = $('ctrl-subtitles');
  const episodesBtn = $('ctrl-episodes');
  const episodesPanel = $('player-episodes-panel');
  const episodesPanelClose = $('player-episodes-close');
  const episodesList = $('player-episodes-list');
  const episodesPanelTitle = $('player-episodes-title');
  const nextEpisodePrompt = $('player-next-episode');
  const nextEpisodeTitle = $('next-episode-title');
  const nextEpisodeMeta = $('next-episode-meta');
  const nextEpisodePlay = $('next-episode-play');
  const nextEpisodeDismiss = $('next-episode-dismiss');
  const subtitlesOverlay = $('player-subtitles-overlay');
  const backBtn = $('player-back-btn');
  let subtitleCues = [];
  let subtitlesEnabled = false;
  let subtitlesLoadToken = 0;
  let currentPlaybackItem = null;
  let lastProgressSaveAt = 0;
  let nextEpisodeTimer = null;
  let nextPromptEpisodeId = null;
  let dismissedNextPromptFor = null;

  if (!playerOverlay) return;

  function extractVideoUrl(url) {
    if (!url) return '';
    if (url.includes('goplayer.php') || url.includes('axplay.shop')) {
      try {
        const urlObj = new URL(url);
        const d = urlObj.searchParams.get('d');
        const primaryURL = urlObj.searchParams.get('primaryURL');
        if (d && primaryURL) {
          return `${primaryURL.replace(/\/$/, '')}${d}`;
        }
        const fallbackURL = urlObj.searchParams.get('fallbackURL');
        if (d && fallbackURL) {
          return `${fallbackURL.replace(/\/$/, '')}${d}`;
        }
      } catch (e) {
        console.error('Erro ao extrair URL do player Axplay:', e);
      }
    }
    return url;
  }

  function getPlayableUrl(url) {
    if (!url) return '';
    let targetUrl = extractVideoUrl(url);
    // RedetToons serve MP4 direto — rotear pelo proxy local para suporte a Range requests e seek
    if (targetUrl.includes('redetoons.fun')) {
      return `/api/redetoons-proxy?url=${encodeURIComponent(targetUrl)}`;
    }
    if (targetUrl.includes('.m3u8') && targetUrl.startsWith('http')) {
      try {
        const urlObj = new URL(targetUrl);
        return `/api/hls-proxy/${urlObj.hostname}${urlObj.pathname}${urlObj.search}`;
      } catch (e) {
        console.error('Erro ao mapear link HLS para o Proxy:', e);
      }
    }
    return targetUrl;
  }

  function parseVttTime(value) {
    const cleanValue = value.trim().replace(',', '.');
    const parts = cleanValue.split(':');
    if (parts.length < 2) return 0;

    const seconds = parseFloat(parts.pop()) || 0;
    const minutes = parseInt(parts.pop(), 10) || 0;
    const hours = parseInt(parts.pop() || '0', 10) || 0;

    return (hours * 3600) + (minutes * 60) + seconds;
  }

  function cleanSubtitleText(text) {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/\\N/g, '\n')
      .replace(/\r/g, '')
      .trim();
  }

  function decodeSubtitleBuffer(buffer) {
    const bytes = new Uint8Array(buffer);

    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return new TextDecoder('utf-8').decode(bytes);
    }
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return new TextDecoder('utf-16le').decode(bytes);
    }
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return new TextDecoder('utf-16be').decode(bytes);
    }

    try {
      return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    } catch {
      try {
        return new TextDecoder('windows-1252').decode(bytes);
      } catch {
        return new TextDecoder('iso-8859-1').decode(bytes);
      }
    }
  }

  function parseVtt(text) {
    return text
      .replace(/^\uFEFF/, '')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .split(/\n{2,}/)
      .map(block => block.trim())
      .filter(Boolean)
      .reduce((cues, block) => {
        if (/^(WEBVTT|NOTE|STYLE|REGION)(\s|$)/i.test(block)) return cues;

        const lines = block.split('\n');
        const timeLineIndex = lines.findIndex(line => line.includes('-->'));
        if (timeLineIndex === -1) return cues;

        const [rawStart, rawEnd] = lines[timeLineIndex].split('-->');
        const endTime = rawEnd.trim().split(/\s+/)[0];
        const cueText = cleanSubtitleText(lines.slice(timeLineIndex + 1).join('\n'));

        if (!cueText) return cues;

        cues.push({
          start: parseVttTime(rawStart),
          end: parseVttTime(endTime),
          text: cueText
        });
        return cues;
      }, []);
  }

  function hideCustomSubtitles() {
    if (!subtitlesOverlay) return;
    subtitlesOverlay.textContent = '';
    subtitlesOverlay.style.display = 'none';
  }

  function syncSubtitlesButton() {
    if (!subtitlesBtn) return;

    subtitlesBtn.classList.toggle('active', subtitlesEnabled);
    subtitlesBtn.setAttribute('aria-pressed', subtitlesEnabled ? 'true' : 'false');
    subtitlesBtn.setAttribute('aria-label', subtitlesEnabled ? 'Legendas ativadas' : 'Legendas desativadas');
    subtitlesBtn.title = subtitlesEnabled ? 'Legendas ativadas' : 'Legendas desativadas';
  }

  function resetCustomSubtitles() {
    subtitlesLoadToken += 1;
    subtitleCues = [];
    subtitlesEnabled = false;
    hideCustomSubtitles();

    if (subtitlesBtn) {
      subtitlesBtn.disabled = false;
      subtitlesBtn.classList.remove('is-loading');
      subtitlesBtn.classList.add('is-unavailable');
      subtitlesBtn.style.display = 'inline-flex';
      syncSubtitlesButton();
      subtitlesBtn.disabled = true;
      subtitlesBtn.setAttribute('aria-label', 'Legenda indisponivel');
      subtitlesBtn.title = 'Legenda indisponivel';
    }
  }

  function showSubtitlesLoadingState() {
    if (!subtitlesBtn) return;
    subtitlesBtn.style.display = 'inline-flex';
    subtitlesBtn.disabled = true;
    subtitlesBtn.classList.add('is-loading');
    subtitlesBtn.classList.remove('is-unavailable');
    subtitlesBtn.setAttribute('aria-pressed', 'false');
    subtitlesBtn.setAttribute('aria-label', 'Carregando legendas');
    subtitlesBtn.title = 'Carregando legendas';
  }

  function showSubtitlesUnavailableState() {
    if (!subtitlesBtn) return;
    subtitlesBtn.style.display = 'inline-flex';
    subtitlesBtn.disabled = true;
    subtitlesBtn.classList.remove('is-loading');
    subtitlesBtn.classList.add('is-unavailable');
    subtitlesBtn.setAttribute('aria-pressed', 'false');
    subtitlesBtn.setAttribute('aria-label', 'Legenda indisponivel');
    subtitlesBtn.title = 'Legenda indisponivel';
  }

  function updateCustomSubtitles() {
    if (!subtitlesOverlay || !subtitlesEnabled || subtitleCues.length === 0) {
      hideCustomSubtitles();
      return;
    }

    const currentTime = video.currentTime || 0;
    const activeCue = subtitleCues.find(cue => currentTime >= cue.start && currentTime <= cue.end);

    if (!activeCue) {
      hideCustomSubtitles();
      return;
    }

    subtitlesOverlay.textContent = activeCue.text;
    subtitlesOverlay.style.display = 'block';
  }

  function normalizeSubtitleUrl(subtitlesUrl) {
    const value = String(subtitlesUrl || '').trim().replace(/\\/g, '/');
    if (!value) return '';
    if (/^(https?:|data:|blob:|\/)/i.test(value)) return encodeURI(value);
    return encodeURI(`/${value.replace(/^\/+/, '')}`);
  }

  async function loadCustomSubtitles(subtitlesUrl) {
    const loadToken = ++subtitlesLoadToken;
    const normalizedUrl = normalizeSubtitleUrl(subtitlesUrl);
    if (!normalizedUrl) return;
    showSubtitlesLoadingState();

    try {
      const res = await fetch(normalizedUrl, { cache: 'no-store' });
      if (!res.ok) throw new Error('Nao foi possivel carregar a legenda');

      const buffer = await res.arrayBuffer();
      const text = decodeSubtitleBuffer(buffer);
      const cues = parseVtt(text);
      if (loadToken !== subtitlesLoadToken) return;

      if (cues.length === 0) {
        throw new Error('A legenda foi encontrada, mas nao tem falas validas em formato VTT ou SRT');
      }

      subtitleCues = cues;
      subtitlesEnabled = cues.length > 0;

      if (subtitlesBtn && cues.length > 0) {
        subtitlesBtn.style.display = 'inline-flex';
        subtitlesBtn.disabled = false;
        subtitlesBtn.classList.remove('is-loading', 'is-unavailable');
        syncSubtitlesButton();
      }

      updateCustomSubtitles();
    } catch (err) {
      if (loadToken !== subtitlesLoadToken) return;
      console.error('Erro ao carregar legendas customizadas:', err);
      subtitleCues = [];
      subtitlesEnabled = false;
      hideCustomSubtitles();
      showSubtitlesUnavailableState();
      showToast('Nao foi possivel carregar a legenda');
    }
  }

  function shouldResumeProgress(entry) {
    if (!entry) return false;
    const durationSeconds = Number(entry.durationSeconds) || 0;
    const currentTime = Number(entry.currentTime) || 0;
    return currentTime > 5 && durationSeconds > 0 && currentTime < durationSeconds - 20;
  }

  function resumeNativePlayback(seconds) {
    const resumeAt = Number(seconds) || 0;
    if (resumeAt <= 5) return;

    let applied = false;
    const applyResume = () => {
      if (applied || !video.duration) return;
      applied = true;
      video.currentTime = Math.min(resumeAt, Math.max(0, video.duration - 10));
      showToast(`Continuando de ${formatProgressTime(resumeAt)}`);
    };

    if (video.readyState >= 1) {
      applyResume();
      return;
    }

    video.addEventListener('loadedmetadata', applyResume, { once: true });
    video.addEventListener('canplay', applyResume, { once: true });
  }

  function trackPlaybackProgress(force = false) {
    if (!currentPlaybackItem || !video.duration || video.paused && !force) return;

    const now = Date.now();
    if (!force && now - lastProgressSaveAt < 5000) return;

    lastProgressSaveAt = now;
    saveWatchProgress(currentPlaybackItem, video.currentTime, video.duration);
  }

  function clearNextEpisodePrompt() {
    clearTimeout(nextEpisodeTimer);
    nextEpisodeTimer = null;
    nextPromptEpisodeId = null;

    if (nextEpisodePrompt) {
      nextEpisodePrompt.hidden = true;
      nextEpisodePrompt.classList.remove('show', 'auto-next');
    }
  }

  function hideEpisodePanel() {
    if (episodesPanel) {
      episodesPanel.hidden = true;
      episodesPanel.classList.remove('show');
    }
    if (episodesBtn) {
      episodesBtn.classList.remove('active');
      episodesBtn.setAttribute('aria-expanded', 'false');
    }
  }

  function getCurrentSeriesSeasons() {
    if (currentPlaybackItem?.seriesSeasons) return currentPlaybackItem.seriesSeasons;
    if (currentPlaybackItem?.seriesEpisodes) return groupEpisodesBySeason(currentPlaybackItem.seriesEpisodes);
    return [];
  }

  function getEpisodeButtonLabel(ep) {
    return `T${Number(ep.season) || 1}:E${Number(ep.number) || 1}`;
  }

  function buildPlaybackItemFromPlayerEpisode(ep) {
    const seriesId = currentPlaybackItem?.seriesId || currentPlaybackItem?.movieId || currentPlaybackItem?.id;
    const baseMovie = getSeriesBaseMovie(seriesId, currentPlaybackItem || {});
    return buildEpisodePlaybackItem(baseMovie, ep, getCurrentSeriesSeasons());
  }

  function playPlayerEpisode(ep) {
    if (!ep) return;
    trackPlaybackProgress(true);
    clearNextEpisodePrompt();
    hideEpisodePanel();
    window.openVideoPlayer(buildPlaybackItemFromPlayerEpisode(ep));
  }

  function renderPlayerEpisodes() {
    if (!episodesBtn || !episodesList || !currentPlaybackItem?.episodeId || !Array.isArray(currentPlaybackItem.seriesEpisodes)) {
      if (episodesBtn) episodesBtn.style.display = 'none';
      hideEpisodePanel();
      return;
    }

    const episodes = currentPlaybackItem.seriesEpisodes;
    if (episodes.length === 0) {
      episodesBtn.style.display = 'none';
      hideEpisodePanel();
      return;
    }

    episodesBtn.style.display = 'inline-flex';
    if (episodesPanelTitle) {
      episodesPanelTitle.textContent = currentPlaybackItem.seriesTitle || 'Serie';
    }

    const watchedSet = readWatchedEpisodes();
    const progress = readWatchProgress();
    episodesList.innerHTML = episodes.map(ep => {
      const isCurrent = String(ep.id) === String(currentPlaybackItem.episodeId);
      const isWatched = watchedSet.has(String(ep.id));
      const saved = progress[`episode:${ep.id}`];
      const progressTime = Number(saved?.currentTime) || 0;
      const progressDuration = Number(saved?.durationSeconds) || 0;
      const hasProgress = !isWatched && progressTime > 0 && progressDuration > 0;
      const pct = hasProgress ? Math.min(100, Math.max(0, (progressTime / progressDuration) * 100)) : 0;
      const stateLabel = isCurrent ? 'Assistindo agora' : (isWatched ? 'Assistido' : (hasProgress ? `Parou em ${formatSeconds(progressTime)}` : (ep.duration || '')));

      return `
        <button class="player-episode-item ${isCurrent ? 'active' : ''} ${isWatched ? 'watched' : ''}" type="button" data-episode-id="${ep.id}">
          <span class="player-episode-index">${getEpisodeButtonLabel(ep)}</span>
          <span class="player-episode-main">
            <strong>${escapeHtml(ep.title || 'Episodio')}</strong>
            <small>${escapeHtml(stateLabel)}</small>
            ${hasProgress ? `<span class="player-episode-progress"><i style="width:${pct}%"></i></span>` : ''}
          </span>
          ${isWatched ? '<i class="fa-solid fa-circle-check player-episode-check"></i>' : ''}
        </button>
      `;
    }).join('');

    episodesList.querySelectorAll('.player-episode-item').forEach(button => {
      button.addEventListener('click', () => {
        const ep = episodes.find(item => String(item.id) === String(button.dataset.episodeId));
        if (ep && String(ep.id) !== String(currentPlaybackItem.episodeId)) {
          playPlayerEpisode(ep);
        }
      });
    });
  }

  function showNextEpisodePrompt(nextEpisode, autoplay = false) {
    if (!nextEpisodePrompt || !nextEpisode) return;

    clearTimeout(nextEpisodeTimer);
    nextPromptEpisodeId = nextEpisode.id;
    nextEpisodePrompt.hidden = false;
    nextEpisodePrompt.classList.add('show');
    nextEpisodePrompt.classList.toggle('auto-next', autoplay);

    if (nextEpisodeTitle) {
      nextEpisodeTitle.textContent = `${getEpisodeButtonLabel(nextEpisode)} ${nextEpisode.title || ''}`.trim();
    }
    if (nextEpisodeMeta) {
      nextEpisodeMeta.textContent = autoplay ? 'Reproduzindo automaticamente em alguns segundos' : 'Clique para ir para o proximo';
    }

    if (autoplay) {
      nextEpisodeTimer = setTimeout(() => {
        playPlayerEpisode(nextEpisode);
      }, 6000);
    }
  }

  function maybeShowNextEpisodePrompt() {
    if (!currentPlaybackItem || !video.duration || dismissedNextPromptFor === String(currentPlaybackItem.episodeId)) return;

    const nextEpisode = findNextEpisode(currentPlaybackItem);
    if (!nextEpisode || nextPromptEpisodeId === nextEpisode.id) return;

    const remaining = video.duration - video.currentTime;
    const watchedPct = video.currentTime / video.duration;
    if (remaining <= 35 && watchedPct >= 0.75) {
      showNextEpisodePrompt(nextEpisode, false);
    }
  }

  // Global open function
  window.openVideoPlayer = async function(movie) {
    const isTrailerPlayback = Boolean(movie?.isTrailer);
    if (!isTrailerPlayback) {
      const allowed = await checkSubscriptionAndScreens();
      if (!allowed) return;
    }

    movie = await enrichSeriesPlaybackItem(movie);
    clearNextEpisodePrompt();
    hideEpisodePanel();
    dismissedNextPromptFor = null;

    $('player-controls-title').textContent = movie.title;
    playerOverlay.classList.add('show');
    playerOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Determinar se o link é Iframe (YouTube/Vimeo/Google Drive) ou vídeo direto (.mp4, .webm, .m3u8, redetoons.fun)
    const rawUrl = movie.videoUrl || movie.videourl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    const url = getPlayableUrl(rawUrl);
    currentPlaybackItem = isTrailerPlayback ? null : { ...movie, videoUrl: rawUrl };
    lastProgressSaveAt = 0;
    renderPlayerEpisodes();
    
    const cleanUrl = url.toLowerCase().split('?')[0];
    // redetoons.fun serve MP4 diretamente (Content-Type: video/mp4) — tratar como vídeo nativo
    const isDirectVideo = cleanUrl.endsWith('.mp4') || 
                          cleanUrl.endsWith('.webm') || 
                          cleanUrl.endsWith('.mkv') || 
                          cleanUrl.endsWith('.m4v') || 
                          cleanUrl.endsWith('.ogv') || 
                          cleanUrl.endsWith('.m3u8') ||
                          url.includes('.m3u8?') ||
                          url.includes('/api/video/stream') ||
                          url.includes('redetoons.fun');

    const isIframeSource = url.includes('youtube.com') || url.includes('youtu.be') ||
                           url.includes('vimeo.com') || url.includes('drive.google.com');

    resetCustomSubtitles();

    if (!isDirectVideo || isIframeSource) {
      currentPlaybackItem = null;
      renderPlayerEpisodes();
      // Configurar modo Iframe
      video.style.display = 'none';
      iframeWrapper.classList.add('active');
      
      let embedUrl = url;
      if (url.includes('youtube.com/watch?v=')) {
        const id = url.split('v=')[1]?.split('&')[0];
        embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&modestbranding=1&rel=0`;
      } else if (url.includes('youtu.be/')) {
        const id = url.split('youtu.be/')[1]?.split('?')[0];
        embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&modestbranding=1&rel=0`;
      } else if (url.includes('vimeo.com/')) {
        const id = url.split('vimeo.com/')[1]?.split('?')[0];
        embedUrl = `https://player.vimeo.com/video/${id}?autoplay=1`;
      } else if (url.includes('drive.google.com')) {
        // Tratar link do Google Drive (/preview)
        embedUrl = url.replace('/view', '/preview').replace('?usp=sharing', '');
      }
      
      iframe.src = embedUrl;
      // Ocultar controles customizados nativos para iframe
      $('player-controls').style.display = 'none';
    } else {
      // Configurar modo Vídeo Nativo
      iframeWrapper.classList.remove('active');
      iframe.src = '';
      video.style.display = 'block';
      $('player-controls').style.display = 'flex';

      // Limpar qualquer instância anterior do Hls
      if (window.hlsPlayer) {
        window.hlsPlayer.destroy();
        window.hlsPlayer = null;
      }

      // Limpar tracks de legendas anteriores
      video.querySelectorAll('track').forEach(t => t.remove());

      const subtitlesUrl = movie.subtitlesUrl || movie.subtitlesurl || '';
      if (subtitlesUrl) {
        loadCustomSubtitles(subtitlesUrl);
      }

      const savedProgress = getSavedWatchProgress(currentPlaybackItem);
      const resumeTime = shouldResumeProgress(savedProgress) ? savedProgress.currentTime : 0;
      
      if (url.includes('.m3u8')) {
        if (typeof Hls !== 'undefined' && Hls.isSupported()) {
          const hls = new Hls();
          hls.loadSource(url);
          hls.attachMedia(video);
          window.hlsPlayer = hls;
          hls.on(Hls.Events.MANIFEST_PARSED, function() {
            video.play().catch(() => {});
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = url;
          video.addEventListener('loadedmetadata', function() {
            video.play().catch(() => {});
          });
        } else {
          showToast('⚠️ Seu navegador não suporta streaming HLS.');
        }
      } else {
        video.src = url;
        video.load();
        video.play().catch(() => {});
      }
      resumeNativePlayback(resumeTime);
      updatePlayPauseIcon(true);
    }

    // Iniciar monitoramento do mouse para ocultar os controles
    resetControlsTimer();
    document.addEventListener('mousemove', resetControlsTimer);

    // Iniciar verificação de orientação para mobile
    rotationHintDismissed = false;
    initRotationHint();
    checkOrientation();
  };

  // Funções para Notificação de Orientação
  let rotationHintDismissed = false;

  function initRotationHint() {
    if (document.getElementById('rotation-hint')) return;

    const hint = document.createElement('div');
    hint.id = 'rotation-hint';
    hint.setAttribute('role', 'alert');
    hint.style.cssText = `
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 10, 10, 0.98);
      z-index: 100000;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      text-align: center;
      font-family: sans-serif;
      padding: 30px;
      box-sizing: border-box;
      opacity: 0;
      transition: opacity 0.4s ease;
    `;

    hint.innerHTML = `
      <div style="font-size: 4.5rem; margin-bottom: 24px; animation: rotateDeviceAnimation 2s infinite ease-in-out; display: inline-block;">🔄</div>
      <h2 style="color: #ffd700; margin: 0 0 12px; font-family: sans-serif; font-size: 1.6rem; font-weight: 700; letter-spacing: 0.5px;">Vire sua Tela</h2>
      <p style="color: #b3b3b3; font-size: 1rem; max-width: 320px; margin: 0 0 28px; line-height: 1.6; font-weight: 300;">Para aproveitar a melhor experiência de cinema em tela cheia, gire o seu celular para a horizontal.</p>
      <button id="btn-dismiss-rotation" style="background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.25); color: #fff; padding: 10px 24px; border-radius: 50px; font-size: 0.9rem; font-weight: 500; cursor: pointer; transition: all 0.2s ease; outline: none;">Continuar em Pé</button>
      <style>
        @keyframes rotateDeviceAnimation {
          0% { transform: rotate(0deg); }
          50% { transform: rotate(-90deg); }
          100% { transform: rotate(0deg); }
        }
        #btn-dismiss-rotation:hover {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
        }
      </style>
    `;

    document.body.appendChild(hint);

    hint.querySelector('#btn-dismiss-rotation').addEventListener('click', () => {
      hideHint(true);
    });
  }

  function checkOrientation() {
    const hint = document.getElementById('rotation-hint');
    if (!hint) return;

    const playerOpen = playerOverlay.classList.contains('show');
    if (!playerOpen) {
      hideHint();
      return;
    }

    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const isPortrait = window.innerHeight > window.innerWidth;

    if (isTouch && isPortrait && !rotationHintDismissed) {
      showHint();
    } else {
      hideHint();
    }
  }

  function showHint() {
    const hint = document.getElementById('rotation-hint');
    if (!hint) return;
    hint.style.display = 'flex';
    hint.offsetHeight; // trigger reflow
    hint.style.opacity = '1';
  }

  function hideHint(manual = false) {
    const hint = document.getElementById('rotation-hint');
    if (!hint) return;
    if (manual) {
      rotationHintDismissed = true;
    }
    hint.style.opacity = '0';
    setTimeout(() => {
      if (hint.style.opacity === '0') {
        hint.style.display = 'none';
      }
    }, 400);
  }

  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);

  // Close player function
  window.closeVideoPlayer = function() {
    trackPlaybackProgress(true);
    currentPlaybackItem = null;
    clearNextEpisodePrompt();
    hideEpisodePanel();
    playerOverlay.classList.remove('show');
    playerOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Parar vídeos e limpar fontes
    video.pause();
    video.src = '';
    iframe.src = '';

    if (window.hlsPlayer) {
      window.hlsPlayer.destroy();
      window.hlsPlayer = null;
    }

    resetCustomSubtitles();
    hideHint();
    
    document.removeEventListener('mousemove', resetControlsTimer);
    clearTimeout(controlsTimeout);
    playerOverlay.classList.remove('controls-hidden');
  };

  backBtn.addEventListener('click', closeVideoPlayer);

  if (episodesBtn) {
    episodesBtn.addEventListener('click', () => {
      if (!episodesPanel || episodesBtn.style.display === 'none') return;
      const willOpen = episodesPanel.hidden;
      episodesPanel.hidden = !willOpen;
      episodesPanel.classList.toggle('show', willOpen);
      episodesBtn.classList.toggle('active', willOpen);
      episodesBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      if (willOpen) renderPlayerEpisodes();
      resetControlsTimer();
    });
  }

  if (episodesPanelClose) {
    episodesPanelClose.addEventListener('click', hideEpisodePanel);
  }

  if (nextEpisodePlay) {
    nextEpisodePlay.addEventListener('click', () => {
      const nextEpisode = findNextEpisode(currentPlaybackItem);
      if (nextEpisode) playPlayerEpisode(nextEpisode);
    });
  }

  if (nextEpisodeDismiss) {
    nextEpisodeDismiss.addEventListener('click', () => {
      dismissedNextPromptFor = currentPlaybackItem?.episodeId ? String(currentPlaybackItem.episodeId) : null;
      clearNextEpisodePrompt();
      resetControlsTimer();
    });
  }

  // Play / Pause Toggle
  function togglePlay() {
    if (video.paused) {
      video.play().catch(() => {});
      updatePlayPauseIcon(true);
      playerOverlay.classList.add('playing');
    } else {
      video.pause();
      updatePlayPauseIcon(false);
      playerOverlay.classList.remove('playing');
    }
  }

  function updatePlayPauseIcon(isPlaying) {
    const playIcon = playPauseBtn.querySelector('.icon-play');
    const pauseIcon = playPauseBtn.querySelector('.icon-pause');
    if (isPlaying) {
      playIcon.style.display = 'none';
      pauseIcon.style.display = 'block';
    } else {
      playIcon.style.display = 'block';
      pauseIcon.style.display = 'none';
    }
  }

  playPauseBtn.addEventListener('click', togglePlay);
  function showDoubleTapFeedback(side) {
    const existing = playerOverlay.querySelector('.double-tap-feedback');
    if (existing) existing.remove();

    const feedback = document.createElement('div');
    feedback.className = `double-tap-feedback ${side}`;
    
    const iconClass = side === 'right' ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left';
    const text = side === 'right' ? '+10s' : '-10s';

    feedback.innerHTML = `
      <div class="double-tap-icon-wrapper">
        <i class="${iconClass}"></i>
        <span>${text}</span>
      </div>
    `;

    const container = $('player-container') || playerOverlay;
    container.appendChild(feedback);

    requestAnimationFrame(() => {
      feedback.classList.add('animate-in');
    });

    setTimeout(() => {
      feedback.style.opacity = '0';
      setTimeout(() => {
        feedback.remove();
      }, 200);
    }, 450);
  }

  let lastVideoClickTime = 0;
  let clickTimeout = null;

  video.addEventListener('click', (e) => {
    const mobilePlayer = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches;
    if (!mobilePlayer) {
      togglePlay();
      return;
    }

    const currentTime = Date.now();
    const delay = 320;
    
    if (currentTime - lastVideoClickTime < delay) {
      clearTimeout(clickTimeout);
      clickTimeout = null;
      
      const rect = video.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const isRightSide = clickX > rect.width / 2;
      
      if (isRightSide) {
        video.currentTime = Math.min(video.duration || 0, video.currentTime + 10);
        showDoubleTapFeedback('right');
      } else {
        video.currentTime = Math.max(0, video.currentTime - 10);
        showDoubleTapFeedback('left');
      }
      
      lastVideoClickTime = 0;
    } else {
      lastVideoClickTime = currentTime;
      clickTimeout = setTimeout(() => {
        resetControlsTimer();
        clickTimeout = null;
      }, delay);
    }
  });

  // Rewind / Forward 10s
  rewindBtn.addEventListener('click', () => {
    video.currentTime = Math.max(0, video.currentTime - 10);
  });

  forwardBtn.addEventListener('click', () => {
    video.currentTime = Math.min(video.duration, video.currentTime + 10);
  });

  // Time formatting helper (HH:MM:SS ou MM:SS)
  function formatTime(seconds) {
    if (isNaN(seconds)) return "00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const formattedM = String(m).padStart(2, '0');
    const formattedS = String(s).padStart(2, '0');

    if (h > 0) {
      return `${h}:${formattedM}:${formattedS}`;
    }
    return `${formattedM}:${formattedS}`;
  }

  let isScrubbingProgress = false;

  function getProgressFromPointer(event) {
    if (!progressContainer) return 0;
    const rect = progressContainer.getBoundingClientRect();
    if (!rect.width) return 0;
    const clientX = event.clientX ?? 0;
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
  }

  function updateProgressUi(seconds) {
    if (!video.duration) return;
    const pct = Math.max(0, Math.min(100, (seconds / video.duration) * 100));
    progressFill.style.width = `${pct}%`;
    progressHandle.style.left = `${pct}%`;
    progressContainer.setAttribute('aria-valuenow', String(Math.round(pct)));
    progressContainer.setAttribute('aria-valuetext', `${formatTime(seconds)} de ${formatTime(video.duration)}`);
    timeCurrent.textContent = formatTime(seconds);
  }

  function seekToPointer(event) {
    if (!video.duration) return;
    const nextTime = getProgressFromPointer(event) * video.duration;
    video.currentTime = nextTime;
    updateProgressUi(nextTime);
    resetControlsTimer();
  }

  // Update progress bar
  video.addEventListener('timeupdate', () => {
    updateCustomSubtitles();
    if (!video.duration) return;
    trackPlaybackProgress();
    maybeShowNextEpisodePrompt();
    if (!isScrubbingProgress) {
      updateProgressUi(video.currentTime);
    }
  });

  // Load duration when metadata is ready
  video.addEventListener('loadedmetadata', () => {
    timeDuration.textContent = formatTime(video.duration);
  });

  video.addEventListener('ended', () => {
    const completedItem = currentPlaybackItem;
    const nextEpisode = findNextEpisode(completedItem);
    markPlaybackCompleted(currentPlaybackItem);
    renderPlayerEpisodes();
    if (nextEpisode) {
      showNextEpisodePrompt(nextEpisode, true);
    } else {
      currentPlaybackItem = null;
    }
  });

  progressContainer.addEventListener('pointerdown', (event) => {
    if (!video.duration) return;
    event.preventDefault();
    isScrubbingProgress = true;
    progressContainer.classList.add('is-scrubbing');
    progressContainer.setPointerCapture?.(event.pointerId);
    seekToPointer(event);
  });

  progressContainer.addEventListener('pointermove', (event) => {
    const pct = getProgressFromPointer(event) * 100;
    if (progressHover) progressHover.style.width = `${pct}%`;
    if (isScrubbingProgress) {
      event.preventDefault();
      seekToPointer(event);
    }
  });

  function stopProgressScrub(event) {
    if (!isScrubbingProgress) return;
    isScrubbingProgress = false;
    progressContainer.classList.remove('is-scrubbing');
    if (event?.pointerId !== undefined) {
      try {
        progressContainer.releasePointerCapture?.(event.pointerId);
      } catch (_) {}
    }
    trackPlaybackProgress(true);
  }

  progressContainer.addEventListener('pointerup', stopProgressScrub);
  progressContainer.addEventListener('pointercancel', stopProgressScrub);
  progressContainer.addEventListener('lostpointercapture', stopProgressScrub);

  progressContainer.addEventListener('pointerleave', () => {
    if (!isScrubbingProgress && progressHover) progressHover.style.width = '0%';
  });

  progressContainer.addEventListener('keydown', (event) => {
    if (!video.duration) return;
    const step = event.shiftKey ? 30 : 10;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - step);
      updateProgressUi(video.currentTime);
    } else if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      video.currentTime = Math.min(video.duration, video.currentTime + step);
      updateProgressUi(video.currentTime);
    } else if (event.key === 'Home') {
      event.preventDefault();
      video.currentTime = 0;
      updateProgressUi(video.currentTime);
    } else if (event.key === 'End') {
      event.preventDefault();
      video.currentTime = video.duration;
      updateProgressUi(video.currentTime);
    }
  });

  // Volume control
  volumeSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    video.volume = val;
    video.muted = (val === 0);
    updateVolumeIcon(val, video.muted);
  });

  volumeBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    updateVolumeIcon(video.volume, video.muted);
  });

  function updateVolumeIcon(volume, isMuted) {
    const highIcon = volumeBtn.querySelector('.icon-volume-high');
    const mutedIcon = volumeBtn.querySelector('.icon-volume-muted');
    if (isMuted || volume === 0) {
      highIcon.style.display = 'none';
      mutedIcon.style.display = 'block';
    } else {
      highIcon.style.display = 'block';
      mutedIcon.style.display = 'none';
    }
  }

  // Speed Menu Control
  speedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isSpeedMenuOpen = !isSpeedMenuOpen;
    speedMenu.classList.toggle('show', isSpeedMenuOpen);
  });

  document.addEventListener('click', () => {
    isSpeedMenuOpen = false;
    speedMenu.classList.remove('show');
  });

  speedMenu.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const speed = parseFloat(e.target.dataset.speed);
      video.playbackRate = speed;
      speedBtn.textContent = speed === 1.0 ? 'Normal' : `${speed}x`;
      
      speedMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
    });
  });

  // Fullscreen toggle
  function toggleFullscreen() {
    // Suporte para iOS (Safari/Chrome no iPhone)
    if (video.webkitEnterFullscreen) {
      try {
        video.webkitEnterFullscreen();
        return;
      } catch (err) {
        console.log('[iOS Fullscreen Error]', err);
      }
    }

    if (!document.fullscreenElement) {
      playerOverlay.requestFullscreen()
        .then(() => {
          fullscreenBtn.querySelector('.icon-fullscreen-enter').style.display = 'none';
          fullscreenBtn.querySelector('.icon-fullscreen-exit').style.display = 'block';
        })
        .catch(() => {});
    } else {
      document.exitFullscreen()
        .then(() => {
          fullscreenBtn.querySelector('.icon-fullscreen-enter').style.display = 'block';
          fullscreenBtn.querySelector('.icon-fullscreen-exit').style.display = 'none';
        })
        .catch(() => {});
    }
  }

  fullscreenBtn.addEventListener('click', toggleFullscreen);
  video.addEventListener('dblclick', toggleFullscreen);

  if (subtitlesBtn) {
    subtitlesBtn.addEventListener('click', () => {
      if (subtitleCues.length === 0) return;

      subtitlesEnabled = !subtitlesEnabled;
      syncSubtitlesButton();
      if (subtitlesEnabled) {
        updateCustomSubtitles();
        showToast('Legendas ativadas');
      } else {
        hideCustomSubtitles();
        showToast('Legendas desativadas');
      }
    });
  }

  // Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    if (!playerOverlay.classList.contains('show')) return;
    
    // Ignore keys if inside elements
    if (e.target.tagName === 'INPUT') return;

    if (e.key === ' ') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(video.duration, video.currentTime + 10);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 10);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const val = Math.min(1, video.volume + 0.1);
      video.volume = val;
      volumeSlider.value = val;
      updateVolumeIcon(val, false);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const val = Math.max(0, video.volume - 0.1);
      video.volume = val;
      volumeSlider.value = val;
      updateVolumeIcon(val, val === 0);
    } else if (e.key === 'Escape') {
      closeVideoPlayer();
    }
  });

  // HUD Auto hide
  function resetControlsTimer() {
    playerOverlay.classList.remove('controls-hidden');
    clearTimeout(controlsTimeout);
    if (!video.paused) {
      controlsTimeout = setTimeout(() => {
        if (!isScrubbingProgress && !isSpeedMenuOpen) {
          playerOverlay.classList.add('controls-hidden');
        }
      }, 3500);
    }
  }

  video.addEventListener('play', resetControlsTimer);
  video.addEventListener('pause', () => {
    trackPlaybackProgress(true);
    playerOverlay.classList.remove('controls-hidden');
    clearTimeout(controlsTimeout);
  });
}

function initModal() {
  modalClose.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeModal();
  });
}


// ---- TOAST ----
let toastTimeout;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// ---- UTILS ----
function debounce(fn, delay) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn.apply(this, args), delay);
  };
}

// ---- SEE ALL buttons ----
function initSeeAllButtons() {
  ['see-all-trending', 'see-all-new', 'see-all-top10', 'see-all-action'].forEach(id => {
    const btn = $(id);
    if (btn) btn.addEventListener('click', () => showToast('📽 Carregando catálogo completo...'));
  });

  const explorBtn = $('originals-explore-btn');
  if (explorBtn) explorBtn.addEventListener('click', () => showToast('🏆 Explorando GOATCINE Originais...'));
}

// ---- USER SESSION (JWT Real) ----
function initUserSession() {
  try {
    const token = localStorage.getItem('goatcine_token');
    const user  = JSON.parse(localStorage.getItem('goatcine_user') || 'null');
    const profile = JSON.parse(localStorage.getItem('goatcine_profile') || 'null');
    if (!user) return;

    const navAvatar = $('nav-avatar');
    const menuAvatarCircle = $('menu-avatar-circle');
    const menuUserName = $('menu-user-name');
    const menuUserEmail = $('menu-user-email');
    const dropdown = $('user-menu-dropdown');

    const isImageAvatar = (value) => /^(https?:\/\/|data:image\/)/i.test(value || '');

    // Populate user info
    if (menuUserName) menuUserName.textContent = profile ? profile.name : (user.name || 'Usuário');
    if (menuUserEmail) menuUserEmail.textContent = user.email || 'Conectado via Discord';

    // Avatar: show active profile emoji if available, else photo/letter
    if (profile && profile.avatar_icon) {
      if (isImageAvatar(profile.avatar_icon)) {
        const imageMarkup = `<img src="${profile.avatar_icon}" alt="${profile.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" referrerpolicy="no-referrer" />`;
        if (navAvatar) {
          navAvatar.innerHTML = imageMarkup;
          navAvatar.style.background = '#111111';
          navAvatar.style.borderColor = profile.avatar_color + '88';
        }
        if (menuAvatarCircle) {
          menuAvatarCircle.innerHTML = imageMarkup;
          menuAvatarCircle.style.background = '#111111';
          menuAvatarCircle.style.borderColor = profile.avatar_color + '88';
        }
      } else {
        const emojiStyle = `
          width: 100%; height: 100%; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 22px; background: ${profile.avatar_color}22;
        `;
        if (navAvatar) {
          navAvatar.innerHTML = `<span style="${emojiStyle}">${profile.avatar_icon}</span>`;
          navAvatar.style.background = profile.avatar_color + '22';
          navAvatar.style.borderColor = profile.avatar_color + '88';
        }
        if (menuAvatarCircle) {
          menuAvatarCircle.innerHTML = `<span style="${emojiStyle}; font-size:26px;">${profile.avatar_icon}</span>`;
          menuAvatarCircle.style.background = profile.avatar_color + '22';
          menuAvatarCircle.style.borderColor = profile.avatar_color + '88';
        }
      }
    } else if (user.avatar) {
      if (navAvatar) {
        navAvatar.innerHTML = `<img src="${user.avatar}" alt="${user.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
      }
      if (menuAvatarCircle) {
        menuAvatarCircle.innerHTML = `<img src="${user.avatar}" alt="${user.name}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />`;
      }
    } else {
      const letter = (profile ? profile.name[0] : user.name?.[0] || 'G').toUpperCase();
      if (navAvatar) navAvatar.innerHTML = `<span id="nav-avatar-letter">${letter}</span>`;
      if (menuAvatarCircle) menuAvatarCircle.innerHTML = `<span id="menu-avatar-letter">${letter}</span>`;
    }

    // Toggle dropdown
    if (navAvatar && dropdown) {
      navAvatar.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('show');
        dropdown.setAttribute('aria-hidden', dropdown.classList.contains('show') ? 'false' : 'true');
      });
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !e.target.closest('#nav-avatar')) {
          dropdown.classList.remove('show');
          dropdown.setAttribute('aria-hidden', 'true');
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          dropdown.classList.remove('show');
          dropdown.setAttribute('aria-hidden', 'true');
        }
      });
    }

    // Trocar Perfil — now functional!
    $('menu-btn-switch')?.addEventListener('click', () => {
      dropdown.classList.remove('show');
      window.location.href = '/profiles.html';
    });

    $('menu-btn-profile')?.addEventListener('click', () => {
      dropdown.classList.remove('show');
      window.location.href = '/account-profile.html';
    });

    $('menu-btn-my-goat')?.addEventListener('click', () => {
      dropdown.classList.remove('show');
      window.location.href = '/my-goat.html';
    });

    $('menu-btn-settings')?.addEventListener('click', () => {
      dropdown.classList.remove('show');
      window.location.href = '/account-profile.html#assinatura';
    });

    // Logout
    $('menu-btn-logout')?.addEventListener('click', async () => {
      dropdown.classList.remove('show');
      const confirmed = confirm(`👋 Sair da conta?\n\n👤 ${user.name}`);
      if (!confirmed) return;

      showToast('👋 Saindo...');

      try {
        if (token) {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
          });
        }
      } catch { /* servidor pode estar offline */ }

      localStorage.removeItem('goatcine_token');
      localStorage.removeItem('goatcine_user');
      localStorage.removeItem('goatcine_profile');

      setTimeout(() => {
        window.location.href = '/login.html';
      }, 900);
    });

  } catch (e) {
    localStorage.removeItem('goatcine_token');
    localStorage.removeItem('goatcine_user');
    localStorage.removeItem('goatcine_profile');
    window.location.href = '/login.html';
  }
}

// ---- SUBSCRIPTION FLOW (USER) ----
let allPlansList = [];
let selectedPlanIdForSub = null;
let hasUsedTrial = 0;

async function checkSubscriptionAndScreens() {
  const token = localStorage.getItem('goatcine_token');
  if (!token) return false;

  try {
    const res = await fetch('/api/user/subscription', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Erro ao obter assinatura');
    const data = await res.json();
    
    allPlansList = data.plans || [];
    const sub = data.subscription;
    hasUsedTrial = sub ? sub.has_used_trial : 0;

    if (sub && sub.sub_active === 1) {
      return true; // Subscription active!
    }

    // Subscription inactive — show plans modal
    openSubModal();
    return false;
  } catch (err) {
    showToast('⚠️ Erro ao verificar assinatura.');
    return false;
  }
}

function openSubModal() {
  const overlay = $('sub-modal-overlay');
  if (!overlay) return;

  overlay.classList.add('open');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Mostrar banner de teste grátis apenas se nunca usou
  const trialPromo = $('trial-promo-container');
  if (trialPromo) {
    if (hasUsedTrial === 0) {
      trialPromo.classList.remove('hidden');
      trialPromo.style.display = 'inline-flex';
    } else {
      trialPromo.classList.add('hidden');
      trialPromo.style.display = 'none';
    }
  }

  // Render plan cards
  const grid = $('sub-plans-grid');
  grid.innerHTML = '';
  
  allPlansList.forEach(plan => {
    const card = document.createElement('div');
    card.className = 'premium-plan-card';
    card.dataset.id = plan.id;

    card.innerHTML = `
      <span class="premium-plan-badge">Selecionado</span>
      <div class="premium-plan-header">
        <span class="premium-plan-name">${plan.name}</span>
        <div class="premium-plan-price-box">
          <span class="premium-plan-symbol">R$</span>
          <span class="premium-plan-price">${plan.price.toFixed(2).split('.')[0]}</span>
          <span class="premium-plan-symbol">,${plan.price.toFixed(2).split('.')[1]}</span>
          <span class="premium-plan-period">/mês</span>
        </div>
      </div>
      <div class="premium-plan-features">
        <div class="premium-plan-feature-item">
          <span class="premium-plan-feature-icon">✨</span>
          <span>Resolução Ultra HD</span>
        </div>
        <div class="premium-plan-feature-item">
          <span class="premium-plan-feature-icon">📱</span>
          <span><strong>${plan.screens}</strong> ${plan.screens === 1 ? 'Tela' : 'Telas'} simultâneas</span>
        </div>
      </div>
    `;

    card.onclick = () => selectPlanForSub(plan.id, card);
    grid.appendChild(card);
  });

  // Hide checkout area until a plan is selected
  $('sub-checkout-area').classList.add('hidden');
}

let subPollInterval = null;

function closeSubModal() {
  const overlay = $('sub-modal-overlay');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  if (subPollInterval) {
    clearInterval(subPollInterval);
    subPollInterval = null;
  }
}

async function selectPlanForSub(planId, cardElement) {
  selectedPlanIdForSub = planId;
  document.querySelectorAll('.premium-plan-card').forEach(c => {
    c.classList.remove('active');
  });
  cardElement.classList.add('active');

  // Mostrar área de checkout com loading
  $('sub-checkout-area').classList.remove('hidden');
  $('pix-copy-paste').value = 'Gerando cobrança PIX...';

  const qrWrapper = $('qrcode-container-wrapper');
  if (qrWrapper) {
    qrWrapper.innerHTML = `
      <div style="width:180px;height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#555;gap:8px;">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
        <span style="font-size:12px;">Gerando...</span>
      </div>`;
  }

  // Parar qualquer polling anterior
  if (subPollInterval) {
    clearInterval(subPollInterval);
    subPollInterval = null;
  }

  const token = localStorage.getItem('goatcine_token');

  try {
    const res = await fetch('/api/user/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ planId })
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Erro ao gerar cobrança');
    }
    const data = await res.json();

    // Renderizar QR Code
    if (qrWrapper) {
      if (data.qrcodeImage) {
        // QR Code real da Efí (base64)
        qrWrapper.innerHTML = `<img src="${data.qrcodeImage}" width="180" height="180" style="display:block;margin:0 auto;border-radius:4px;" alt="QR Code Pix" />`;
      } else {
        // Sem imagem: instrução de usar o código copia e cola
        qrWrapper.innerHTML = `
          <div style="width:180px;height:180px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:12px;text-align:center;">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="1.5"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="4" height="4"/></svg>
            <span style="font-size:11px;color:#888;">Use o código Copia e Cola abaixo</span>
          </div>`;
      }
    }

    $('pix-copy-paste').value = data.qrcodeText || '';

    // Iniciar polling a cada 3s — só libera quando o webhook da Efí confirmar
    subPollInterval = setInterval(async () => {
      try {
        const checkRes = await fetch('/api/user/subscription', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          if (checkData.subscription && checkData.subscription.sub_active === 1) {
            clearInterval(subPollInterval);
            subPollInterval = null;
            showSuccessPremiumOverlay();
          }
        }
      } catch (err) {
        // ignora erros de rede silenciosamente
      }
    }, 3000);

  } catch (err) {
    console.error('[PIX CHECKOUT ERROR]', err);
    showToast(`⚠️ ${err.message || 'Erro ao gerar Pix. Tente novamente.'}`);
    $('pix-copy-paste').value = 'Erro ao gerar PIX.';
    if (qrWrapper) {
      qrWrapper.innerHTML = `<div style="width:180px;height:180px;display:flex;align-items:center;justify-content:center;color:#e55;font-size:13px;text-align:center;padding:12px;">Falha ao carregar QR Code</div>`;
    }
  }
}

function showSuccessPremiumOverlay() {
  const existing = $('sub-success-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'sub-success-overlay';
  overlay.className = 'success-premium-overlay';

  overlay.innerHTML = `
    <div class="success-premium-card">
      <div class="success-premium-glow"></div>
      <div class="success-premium-crown-wrapper">
        <i class="fa-solid fa-crown success-premium-icon"></i>
      </div>
      <h2 class="success-premium-title">Você agora é um GOAT! 🐐👑</h2>
      <p class="success-premium-text">Obrigado por se tornar um GOAT e fazer parte disso com a gente. Sua experiência premium está pronta!</p>
      <div class="success-premium-loading-bar-wrapper">
        <div class="success-premium-loading-bar-fill" id="success-loading-fill"></div>
      </div>
      <span class="success-premium-footer">Preparando sua tela premium...</span>
    </div>
  `;

  document.body.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('show');
    setTimeout(() => {
      const fill = $('success-loading-fill');
      if (fill) fill.style.width = '100%';
    }, 100);
  });

  closeSubModal();

  setTimeout(() => {
    overlay.classList.remove('show');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }, 3800);
}

async function activateTrial() {
  const token = localStorage.getItem('goatcine_token');
  if (!token) return;

  const btn = $('btn-activate-trial');
  if (btn) btn.disabled = true;

  try {
    const res = await fetch('/api/user/trial', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      }
    });

    const data = await res.json();
    if (res.ok) {
      showToast('🎉 Teste gratuito de 2 horas ativado!');
      closeSubModal();
      setTimeout(() => window.location.reload(), 1500);
    } else {
      showToast(data.error || 'Erro ao ativar o teste grátis.');
      if (btn) btn.disabled = false;
    }
  } catch (err) {
    showToast('Erro de rede ao ativar o teste grátis.');
    if (btn) btn.disabled = false;
  }
}

function initSubscriptionEvents() {
  $('sub-modal-close')?.addEventListener('click', closeSubModal);
  $('btn-copy-pix')?.addEventListener('click', () => {
    const pixInput = $('pix-copy-paste');
    pixInput.select();
    pixInput.setSelectionRange(0, 99999);
    navigator.clipboard.writeText(pixInput.value)
      .then(() => showToast('📋 Código PIX copiado!'))
      .catch(() => showToast('⚠️ Falha ao copiar.'));
  });
  $('btn-activate-trial')?.addEventListener('click', activateTrial);
}

// ---- CATALOG & ROUTING ----
function showSection(viewName, options = {}) {
  // Rolar suavemente para o topo ao trocar de seção
  if (!options.skipScroll) {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const standardContent = $('standard-content');
  const searchResultsSection = $('search-results-section');
  const catalogSection = $('catalog-section');
  const heroSection = $('hero');
  const searchInput = $('search-input');
  const mobileSearchInput = $('mobile-search-input');

  activeView = viewName;

  // Limpar busca caso mude de página
  if (viewName !== 'search') {
    if (searchInput) searchInput.value = '';
    if (mobileSearchInput) mobileSearchInput.value = '';
    const clearBtn = $('search-pill-clear');
    if (clearBtn) clearBtn.classList.add('hidden');
    if (searchResultsSection) searchResultsSection.classList.add('hidden');
  }

  // Atualizar links ativos na navbar
  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active');
  });
  document.querySelectorAll('.nav-category-link').forEach(link => {
    link.classList.toggle('active', link.dataset.view === viewName);
  });
  
  if (viewName === 'home') {
    $('nav-home')?.classList.add('active');
    if (standardContent) standardContent.classList.remove('hidden');
    if (heroSection) heroSection.style.display = 'block';
    if (catalogSection) catalogSection.classList.add('hidden');
  } else if (viewName === 'movies') {
    $('nav-movies')?.classList.add('active');
    if (standardContent) standardContent.classList.add('hidden');
    if (heroSection) heroSection.style.display = 'none';
    if (catalogSection) catalogSection.classList.remove('hidden');
    renderCatalog('movies');
  } else if (viewName === 'series') {
    $('nav-series')?.classList.add('active');
    if (standardContent) standardContent.classList.add('hidden');
    if (heroSection) heroSection.style.display = 'none';
    if (catalogSection) catalogSection.classList.remove('hidden');
    renderCatalog('series');
  }
}

function renderCatalog(type) {
  currentCatalogType = type;
  const catalogTitle = $('catalog-title');
  const catalogGrid = $('catalog-grid');
  const genreFilter = $('catalog-genre-filter');

  if (!catalogTitle || !catalogGrid || !genreFilter) return;

  // Filtrar títulos com base no tipo
  const allMovies = getAllCatalog();
  // Remover duplicados
  const uniqueMovies = uniqueById(allMovies);
  
  const catalogList = uniqueMovies.filter(m => {
    if (type === 'series') return m.type === 'series';
    return m.type !== 'series';
  });

  catalogTitle.textContent = type === 'series' ? 'Séries de TV' : 'Catálogo de Filmes';

  // Extrair todos os gêneros únicos
  const genres = new Set();
  catalogList.forEach(m => {
    if (m.genre) {
      m.genre.split('/').forEach(g => {
        const clean = g.trim();
        if (clean) genres.add(clean);
      });
    }
  });

  // Popular o dropdown de gêneros
  const sortedGenres = Array.from(genres).sort();
  genreFilter.innerHTML = `<option value="all">Todos os Gêneros</option>` +
    sortedGenres.map(g => `<option value="${g}">${g}</option>`).join('');

  // Função interna para renderizar o grid filtrado
  function filterAndDisplay() {
    const selectedGenre = genreFilter.value;
    const filtered = selectedGenre === 'all' 
      ? catalogList 
      : catalogList.filter(m => m.genre && m.genre.includes(selectedGenre));

    catalogGrid.innerHTML = '';
    if (filtered.length === 0) {
      catalogGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-secondary);">Nenhum título encontrado para este gênero.</div>`;
    } else {
      filtered.forEach(m => {
        catalogGrid.appendChild(createMovieCard(m));
      });
    }
  }

  // Resetar para "Todos os Gêneros" e desenhar inicial
  genreFilter.value = 'all';
  filterAndDisplay();

  // Registrar evento change
  genreFilter.onchange = filterAndDisplay;
}

// ---- START ----
document.addEventListener('DOMContentLoaded', () => {
  initUserSession();
  initSubscriptionEvents();
  initApp();
});
