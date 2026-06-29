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
let MOVIES = { trending: [], new: [], action: [] };
let TOP10 = [];
let HERO_SLIDES = [];

// ---- STATE ----
let currentHeroSlide = 0;
let heroInterval = null;
let myList = new Set();
let isSearchOpen = false;

// ---- DOM REFS ----
const $ = (id) => document.getElementById(id);
const loadingScreen = $('loading-screen');
const loadingBar = $('loading-bar');
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

// ---- LOADING ----
function simulateLoading() {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.random() * 18 + 4;
    if (progress >= 100) {
      progress = 100;
      loadingBar.style.width = '100%';
      clearInterval(interval);
      setTimeout(() => {
        loadingScreen.classList.add('hidden');
        initApp();
      }, 400);
    } else {
      loadingBar.style.width = progress + '%';
    }
  }, 80);
}

// ---- INIT ----
async function initApp() {
  createParticles();

  try {
    const res = await fetch('/api/movies');
    if (!res.ok) throw new Error('Erro ao carregar catálogo');
    const data = await res.json();
    const list = data.movies || [];

    // Organizar por categorias
    MOVIES.trending = list.filter(m => m.category === 'trending');
    MOVIES.new = list.filter(m => m.category === 'new');
    MOVIES.action = list.filter(m => m.category === 'action');

    // Gerar Top 10 dinâmico
    TOP10 = [...list].sort((a, b) => b.rating - a.rating).slice(0, 10);

    // Gerar Hero Slides com os 3 melhores avaliados
    const candidates = [...list].sort((a, b) => b.rating - a.rating);
    HERO_SLIDES = candidates.slice(0, 3).map(m => ({
      title: m.title,
      year: m.year,
      duration: m.duration,
      rating: m.rating,
      genre: m.genre,
      desc: m.desc,
      backdrop: m.backdrop,
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

  renderCarousel('carousel-trending', MOVIES.trending);
  renderCarousel('carousel-new', MOVIES.new);
  renderCarousel('carousel-action', MOVIES.action);
  renderTop10();
  initCarouselArrows();
  initHeroSlider();
  initNavbar();
  initSearch();
  initModal();
  initCategoryTabs();
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
  card.setAttribute('aria-label', `${movie.title} (${movie.year}) - Avaliação: ${movie.rating}`);
  card.dataset.id = movie.id;

  card.innerHTML = `
    <img class="card-poster" 
         src="${movie.poster}" 
         alt="Poster do filme ${movie.title}"
         loading="lazy"
         onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22180%22 height=%22270%22 viewBox=%220 0 180 270%22><rect width=%22180%22 height=%22270%22 fill=%22%23161616%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%23FFD700%22 font-size=%2240%22>🎬</text></svg>'" />
    <div class="card-overlay">
      <div class="card-play-btn" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <polygon points="5,3 19,12 5,21" fill="#000"/>
        </svg>
      </div>
      <div class="card-title">${movie.title}</div>
      <div class="card-rating">⭐ ${movie.rating}</div>
    </div>
    <div class="card-info">
      <div class="card-name">${movie.title}</div>
      <div class="card-year">${movie.year} · ${movie.genre}</div>
    </div>
  `;

  card.addEventListener('click', () => openModal(movie));
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
function renderTop10() {
  const grid = $('top10-grid');
  if (!grid) return;
  grid.innerHTML = '';
  TOP10.forEach((movie, idx) => {
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
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22 viewBox=%220 0 200 300%22><rect width=%22200%22 height=%22300%22 fill=%22%23161616%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%23FFD700%22 font-size=%2248%22>🎬</text></svg>'" />
      <div class="top10-overlay">
        <div class="top10-title">${movie.title}</div>
        <div class="top10-rating">⭐ ${movie.rating}</div>
      </div>
    `;
    card.addEventListener('click', () => openModal(movie));
    grid.appendChild(card);
  });
}

// ---- CAROUSEL ARROWS ----
function initCarouselArrows() {
  const pairs = [
    ['arrow-left-0', 'arrow-right-0', 'carousel-trending'],
    ['arrow-left-1', 'arrow-right-1', 'carousel-new'],
    ['arrow-left-2', 'arrow-right-2', 'carousel-action'],
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
function updateHeroSlide(idx) {
  const slide = HERO_SLIDES[idx];

  // Update background
  heroBg.style.background = `
    linear-gradient(135deg, #1a0e00 0%, #0d0800 30%, #080808 60%, #050505 100%)
  `;

  // Animate content
  const content = document.querySelector('.hero-content');
  content.style.opacity = '0';
  content.style.transform = 'translateY(12px)';

  setTimeout(() => {
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
      if (movie) openVideoPlayer(movie);
    });
  }

  if (listBtn) {
    listBtn.addEventListener('click', () => {
      showToast('✓ Adicionado à sua lista!');
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
function initNavbar() {
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

  // Nav link active state
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

// ---- SEARCH ----
function performSearch(q) {
  const standardContent = $('standard-content');
  const searchResultsSection = $('search-results-section');
  const searchResultsGrid = $('search-results-grid');
  const heroSection = $('hero');
  const clearBtn = $('search-pill-clear');

  if (!q) {
    if (standardContent) standardContent.classList.remove('hidden');
    if (searchResultsSection) searchResultsSection.classList.add('hidden');
    if (heroSection) heroSection.style.display = 'block';
    if (clearBtn) clearBtn.classList.add('hidden');
    if (searchResultsGrid) searchResultsGrid.innerHTML = '';
    return;
  }

  if (clearBtn) clearBtn.classList.remove('hidden');
  if (standardContent) standardContent.classList.add('hidden');
  if (heroSection) heroSection.style.display = 'none';
  if (searchResultsSection) {
    searchResultsSection.classList.remove('hidden');
    const resultsTitle = $('search-results-title');
    if (resultsTitle) {
      resultsTitle.innerHTML = `Resultados para: <strong style="color: var(--text-primary); font-weight: 700;">"${q}"</strong>`;
    }
  }

  // Filtrar todos os filmes
  const allMovies = [...MOVIES.trending, ...MOVIES.new, ...MOVIES.action];
  
  // Remover duplicados
  const uniqueMovies = Array.from(new Map(allMovies.map(m => [m.id, m])).values());

  const found = uniqueMovies.filter(m =>
    m.title.toLowerCase().includes(q.toLowerCase()) ||
    m.genre.toLowerCase().includes(q.toLowerCase()) ||
    (m.director && m.director.toLowerCase().includes(q.toLowerCase())) ||
    (m.cast && m.cast.toLowerCase().includes(q.toLowerCase()))
  );

  if (searchResultsGrid) {
    searchResultsGrid.innerHTML = '';
    if (found.length === 0) {
      searchResultsGrid.innerHTML = `
        <div class="search-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 80px 20px; color: var(--text-secondary);">
          <span style="display: block; font-size: 48px; margin-bottom: 16px;">🍿</span>
          Nenhum resultado encontrado para "${q}". Tente buscar por outros termos!
        </div>
      `;
    } else {
      found.forEach(movie => {
        searchResultsGrid.appendChild(createMovieCard(movie));
      });
    }
  }
}

function initSearch() {
  const searchInput = $('search-input');
  const clearBtn = $('search-pill-clear');

  if (!searchInput) return;

  searchInput.addEventListener('input', debounce((e) => {
    const q = e.target.value.trim();
    performSearch(q);
  }, 300));

  // Limpar busca
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      searchInput.value = '';
      performSearch('');
      searchInput.focus();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.value = '';
      performSearch('');
      searchInput.blur();
    }
  });
}

// ---- CATEGORY TABS ----
function initCategoryTabs() {
  document.querySelectorAll('.cat-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.cat-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      this.classList.add('active');
      this.setAttribute('aria-selected', 'true');
    });
  });
}

// ---- MODAL ----
function findMovieById(id) {
  const allMovies = [...MOVIES.trending, ...MOVIES.new, ...MOVIES.action];
  return allMovies.find(m => m.id === id);
}

function openModal(movie) {
  const modalTitle = $('modal-title');
  const modalDesc = $('modal-desc');
  const modalMeta = $('modal-meta');
  const modalBackdrop = $('modal-backdrop');
  const modalDetailList = $('modal-detail-list');
  const modalSimilarGrid = $('modal-similar-grid');
  const modalWatchBtn = $('modal-watch-btn');
  const modalListBtn = $('modal-list-btn');

  // Set content
  modalTitle.textContent = movie.title;
  modalDesc.textContent = movie.desc;
  modalBackdrop.src = movie.backdrop || movie.poster;
  modalBackdrop.alt = `Imagem de ${movie.title}`;

  modalMeta.innerHTML = `
    <span class="meta-rating">⭐ ${movie.rating}</span>
    <span class="meta-sep">·</span>
    <span class="meta-year">${movie.year}</span>
    <span class="meta-sep">·</span>
    <span class="meta-duration">${movie.duration}</span>
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
      <span class="detail-label">Duração</span>
      <span class="detail-value">${movie.duration}</span>
    </div>
  `;

  // Similar movies
  const allMovies = [...MOVIES.trending, ...MOVIES.new, ...MOVIES.action];
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
           onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22200%22 height=%22300%22><rect width=%22200%22 height=%22300%22 fill=%22%23161616%22/><text x=%2250%%22 y=%2250%%22 text-anchor=%22middle%22 fill=%22%23FFD700%22 font-size=%2248%22>🎬</text></svg>'" />
      <div class="similar-card-name">${m.title}</div>
    `;
    card.addEventListener('click', () => openModal(m));
    modalSimilarGrid.appendChild(card);
  });

  // Watch & List buttons
  modalWatchBtn.onclick = () => {
    closeModal();
    openVideoPlayer(movie);
  };

  modalListBtn.onclick = () => {
    if (myList.has(movie.id)) {
      myList.delete(movie.id);
      showToast(`✕ Removido da sua lista`);
    } else {
      myList.add(movie.id);
      showToast(`✓ ${movie.title} adicionado à lista!`);
    }
  };

  // Show modal
  modalOverlay.classList.add('open');
  modalOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  modal.scrollTop = 0;
}

function closeModal() {
  modalOverlay.classList.remove('open');
  modalOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
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
  const progressFill = $('progress-bar-fill');
  const progressHandle = $('progress-bar-handle');
  const timeCurrent = $('time-current');
  const timeDuration = $('time-duration');
  const speedBtn = $('ctrl-speed');
  const speedMenu = $('speed-menu');
  const fullscreenBtn = $('ctrl-fullscreen');
  const backBtn = $('player-back-btn');

  if (!playerOverlay) return;

  // Global open function
  window.openVideoPlayer = async function(movie) {
    const allowed = await checkSubscriptionAndScreens();
    if (!allowed) return;

    $('player-controls-title').textContent = movie.title;
    playerOverlay.classList.add('show');
    playerOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    // Determinar se o link é Iframe (YouTube/Vimeo/Google Drive) ou vídeo direto (.mp4, .webm)
    const url = movie.videoUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
    
    if (url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || url.includes('drive.google.com')) {
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
      
      video.src = url;
      video.load();
      video.play().catch(() => {});
      updatePlayPauseIcon(true);
    }

    // Iniciar monitoramento do mouse para ocultar os controles
    resetControlsTimer();
    document.addEventListener('mousemove', resetControlsTimer);
  };

  // Close player function
  window.closeVideoPlayer = function() {
    playerOverlay.classList.remove('show');
    playerOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    
    // Parar vídeos e limpar fontes
    video.pause();
    video.src = '';
    iframe.src = '';
    
    document.removeEventListener('mousemove', resetControlsTimer);
    clearTimeout(controlsTimeout);
    playerOverlay.classList.remove('controls-hidden');
  };

  backBtn.addEventListener('click', closeVideoPlayer);

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
  video.addEventListener('click', togglePlay);

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

  // Update progress bar
  video.addEventListener('timeupdate', () => {
    if (!video.duration) return;
    const pct = (video.currentTime / video.duration) * 100;
    progressFill.style.width = `${pct}%`;
    progressHandle.style.left = `${pct}%`;
    timeCurrent.textContent = formatTime(video.currentTime);
  });

  // Load duration when metadata is ready
  video.addEventListener('loadedmetadata', () => {
    timeDuration.textContent = formatTime(video.duration);
  });

  // Scrubbing/Seeking on click
  function seek(e) {
    const rect = progressContainer.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    const clampedPct = Math.max(0, Math.min(1, pct));
    video.currentTime = clampedPct * video.duration;
  }

  let isDragging = false;
  progressContainer.addEventListener('mousedown', (e) => {
    isDragging = true;
    seek(e);
  });

  document.addEventListener('mousemove', (e) => {
    if (isDragging) seek(e);
  });

  document.addEventListener('mouseup', () => {
    isDragging = false;
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
        if (!isDragging && !isSpeedMenuOpen) {
          playerOverlay.classList.add('controls-hidden');
        }
      }, 3500);
    }
  }

  video.addEventListener('play', resetControlsTimer);
  video.addEventListener('pause', () => {
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

    // Populate user info
    if (menuUserName) menuUserName.textContent = profile ? profile.name : (user.name || 'Usuário');
    if (menuUserEmail) menuUserEmail.textContent = user.email || 'Conectado via Discord';

    // Avatar: show active profile emoji if available, else photo/letter
    if (profile && profile.avatar_icon) {
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
      });
      document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && e.target !== navAvatar) {
          dropdown.classList.remove('show');
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') dropdown.classList.remove('show');
      });
    }

    // Trocar Perfil — now functional!
    $('menu-btn-switch')?.addEventListener('click', () => {
      dropdown.classList.remove('show');
      window.location.href = '/profiles.html';
    });

    $('menu-btn-profile')?.addEventListener('click', () => {
      dropdown.classList.remove('show');
      showToast(`👤 Perfil de ${(profile ? profile.name : user.name).split(' ')[0]}!`);
    });

    $('menu-btn-settings')?.addEventListener('click', () => {
      dropdown.classList.remove('show');
      showToast('⚙️ Abrindo configurações da conta...');
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

  // Render plan cards
  const grid = $('sub-plans-grid');
  grid.innerHTML = '';
  
  allPlansList.forEach(plan => {
    const card = document.createElement('div');
    card.style.cssText = `
      background: rgba(255, 255, 255, 0.03);
      border: 2px solid rgba(255, 215, 0, 0.15);
      border-radius: 12px;
      padding: 16px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      gap: 12px;
    `;
    card.className = 'plan-card';
    card.dataset.id = plan.id;

    card.innerHTML = `
      <div>
        <h3 style="font-family: 'Outfit', sans-serif; color: var(--gold-primary); font-size: 1.1rem; margin-bottom: 8px;">${plan.name}</h3>
        <div style="font-size: 1.5rem; font-weight: 700; color: #FFF; margin-bottom: 4px;">R$ ${plan.price.toFixed(2)}</div>
        <div style="font-size: 0.8rem; color: var(--text-secondary);">por mês</div>
      </div>
      <div style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 12px; font-size: 0.85rem; color: var(--text-secondary);">
        📱 <strong>${plan.screens}</strong> ${plan.screens === 1 ? 'Tela' : 'Telas'} Simultâneas
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
  document.querySelectorAll('.plan-card').forEach(c => {
    c.style.borderColor = 'rgba(255, 215, 0, 0.15)';
    c.style.background = 'rgba(255, 255, 255, 0.03)';
  });
  cardElement.style.borderColor = 'var(--gold-primary)';
  cardElement.style.background = 'rgba(255, 215, 0, 0.05)';

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
        qrWrapper.innerHTML = `<img src="data:image/png;base64,${data.qrcodeImage}" width="180" height="180" style="display:block;margin:0 auto;border-radius:4px;" alt="QR Code Pix" />`;
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
            showToast('🎉 Pagamento confirmado! Assinatura ativada.');
            closeSubModal();
            setTimeout(() => window.location.reload(), 1500);
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
}

// ---- START ----
document.addEventListener('DOMContentLoaded', () => {
  initUserSession();
  initSubscriptionEvents();
  simulateLoading();
});

