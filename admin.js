/* =============================================
   GOATCINE — Admin Panel Controller
   ============================================= */

const API = '';

// ---- ELEMENT REFS ----
const $ = (id) => document.getElementById(id);
const loginScreen = $('login-screen');
const adminPanel = $('admin-panel');
const loginForm = $('admin-login-form');
const userGroup = $('user-group');
const passGroup = $('pass-group');

const tabMoviesBtn = $('tab-movies-btn');
const tabUsersBtn = $('tab-users-btn');
const tabPlansBtn = $('tab-plans-btn');
const tabPaymentsBtn = $('tab-payments-btn');
const tabCustomizeBtn = $('tab-customize-btn');
const sectionMovies = $('section-movies');
const sectionUsers = $('section-users');
const sectionPlans = $('section-plans');
const sectionPayments = $('section-payments');
const sectionCustomize = $('section-customize');

const moviesTbody = $('movies-list-tbody');
const usersTbody = $('users-list-tbody');
const paymentsTbody = $('payments-list-tbody');

// Modal Assinatura Avançada
const subAdvancedModal = $('sub-advanced-modal');
const subAdvancedForm = $('sub-advanced-form');
const subAdvUserId = $('sub-adv-user-id');
const subAdvActive = $('sub-adv-active');
const subAdvPlanId = $('sub-adv-plan-id');
const subAdvStart = $('sub-adv-start');
const subAdvEnd = $('sub-adv-end');
const btnCancelSubAdv = $('btn-cancel-sub-adv');
const subAdvCloseBtn = $('sub-advanced-close-btn');

// ---- STATE ----
let movies = [];
let users = [];
let plans = [];
let paymentLogs = [];

// Seletores do Plano
const plansTbody = $('plans-list-tbody');
const planModal = $('plan-modal');
const planForm = $('plan-form');
const planModalTitle = $('plan-modal-title');
const planIdField = $('plan-id');
const pNameInput = $('p-name');
const pPriceInput = $('p-price');
const pScreensInput = $('p-screens');
const pDurationInput = $('p-duration');
const btnCancelPlan = $('btn-cancel-plan');
const planModalCloseBtn = $('plan-modal-close-btn');

const movieModal = $('movie-modal');
const movieForm = $('movie-form');
const modalTitle = $('modal-title');
const btnAddMovie = $('btn-add-movie');
const btnCancelMovie = $('btn-cancel-movie');
const modalCloseBtn = $('modal-close-btn');
const episodesModal = $('episodes-modal');
const episodesModalTitle = $('episodes-modal-title');
const episodesModalCloseBtn = $('episodes-modal-close-btn');
const episodeForm = $('episode-form');
const episodeSeasonFilter = $('episode-season-filter');
const episodesList = $('episodes-list');
const btnNewSeason = $('btn-new-season');
const btnClearEpisode = $('btn-clear-episode');

let currentSeriesId = null;
let currentSeriesTitle = '';
let currentEpisodes = [];

// ---- AUTH UTILS ----
function getAdminToken() {
  return localStorage.getItem('goatcine_admin_token');
}

function checkAdminAuth() {
  const token = getAdminToken();
  if (token) {
    loginScreen.classList.add('hidden');
    adminPanel.classList.remove('hidden');
    loadDashboardData();
  } else {
    loginScreen.classList.remove('hidden');
    adminPanel.classList.add('hidden');
  }
}

// ---- TOASTS ----
let toastTimeout;
function showToast(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  toast.setAttribute('aria-hidden', 'false');

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
    toast.setAttribute('aria-hidden', 'true');
  }, 4000);
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

function getMovieType(movie) {
  return movie?.type === 'series' ? 'series' : 'movie';
}

// ---- LOGIN FORM ----
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const userField = $('admin-user');
  const passField = $('admin-pass');
  
  // Limpar erros
  userGroup.querySelector('.error-msg').textContent = '';
  passGroup.querySelector('.error-msg').textContent = '';

  let valid = true;
  if (!userField.value) {
    userGroup.querySelector('.error-msg').textContent = 'Digite o usuário';
    valid = false;
  }
  if (!passField.value) {
    passGroup.querySelector('.error-msg').textContent = 'Digite a senha';
    valid = false;
  }

  if (!valid) return;

  const submitBtn = $('btn-login-submit');
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API}/api/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: userField.value.trim(), password: passField.value.trim() }),
    });

    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Acesso negado');
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      return;
    }

    // Login efetuado com sucesso!
    localStorage.setItem('goatcine_admin_token', data.token);
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
    userField.value = '';
    passField.value = '';

    showToast('🏆 Bem-vindo de volta, Administrador!');
    checkAdminAuth();

  } catch {
    showToast('Erro de conexão com o servidor');
    submitBtn.classList.remove('loading');
    submitBtn.disabled = false;
  }
});

// LOGOUT
$('btn-logout').addEventListener('click', () => {
  localStorage.removeItem('goatcine_admin_token');
  checkAdminAuth();
  showToast('Sessão encerrada com sucesso.');
});

// =============================================
//  TAB NAVIGATION
// =============================================
function switchTab(target) {
  tabMoviesBtn.classList.toggle('active', target === 'movies');
  tabUsersBtn.classList.toggle('active', target === 'users');
  tabPlansBtn.classList.toggle('active', target === 'plans');
  tabPaymentsBtn.classList.toggle('active', target === 'payments');
  tabCustomizeBtn.classList.toggle('active', target === 'customize');

  sectionMovies.classList.toggle('active', target === 'movies');
  sectionUsers.classList.toggle('active', target === 'users');
  sectionPlans.classList.toggle('active', target === 'plans');
  sectionPayments.classList.toggle('active', target === 'payments');
  sectionCustomize.classList.toggle('active', target === 'customize');
}

tabMoviesBtn.addEventListener('click', () => switchTab('movies'));
tabUsersBtn.addEventListener('click', () => switchTab('users'));
tabPlansBtn.addEventListener('click', () => switchTab('plans'));
tabPaymentsBtn.addEventListener('click', () => switchTab('payments'));
tabCustomizeBtn.addEventListener('click', () => switchTab('customize'));

// =============================================
//  DASHBOARD LOAD DATA
// =============================================
async function loadDashboardData() {
  const token = getAdminToken();
  if (!token) return;

  // 1. Carregar Filmes (Público)
  try {
    const res = await fetch(`${API}/api/movies`);
    const data = await res.json();
    movies = data.movies || [];
    $('stat-movies-count').textContent = movies.length;
    renderMoviesTable();
  } catch (err) {
    console.error('Erro ao carregar filmes:', err);
  }

  // 2. Carregar Usuários (Protegido Admin)
  try {
    const res = await fetch(`${API}/api/admin/users`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.status === 401) {
      // Token expirou
      localStorage.removeItem('goatcine_admin_token');
      checkAdminAuth();
      return;
    }
    const data = await res.json();
    users = data.users || [];
    $('stat-users-count').textContent = users.length;
    renderUsersTable();
  } catch (err) {
    console.error('Erro ao carregar usuários:', err);
  }

  // 3. Carregar Configurações de Planos (Protegido Admin)
  try {
    const res = await fetch(`${API}/api/admin/plans`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      plans = data.plans || [];
      renderPlansTable();
      
      // Atualizar também o select de planos do modal de ativação manual avançada
      const selectAdv = $('sub-adv-plan-id');
      if (selectAdv) {
        selectAdv.innerHTML = plans.map(p => `<option value="${p.id}">${p.name} (${p.screens} ${p.screens === 1 ? 'tela' : 'telas'} - R$ ${p.price.toFixed(2)})</option>`).join('');
      }
    }
  } catch (err) {
    console.error('Erro ao carregar planos:', err);
  }

  // 4. Carregar Logs de Pagamentos (Protegido Admin)
  try {
    const res = await fetch(`${API}/api/admin/payments`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const data = await res.json();
      paymentLogs = data.logs || [];
      renderPaymentsTable();
    }
  } catch (err) {
    console.error('Erro ao carregar pagamentos:', err);
  }
}

// =============================================
//  TABELA DE USUÁRIOS
// =============================================
function renderUsersTable() {
  usersTbody.innerHTML = '';
  
  const query = ($('search-users')?.value || '').toLowerCase().trim();
  const filteredUsers = users.filter(user => {
    const name = (user.name || '').toLowerCase();
    const email = (user.email || '').toLowerCase();
    const discordTag = (user.discord_tag || '').toLowerCase();
    return name.includes(query) || 
           email.includes(query) ||
           discordTag.includes(query) ||
           String(user.id) === query;
  });

  if (filteredUsers.length === 0) {
    usersTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-text-muted);">Nenhum usuário correspondente encontrado.</td></tr>`;
    return;
  }

  filteredUsers.forEach(user => {
    const tr = document.createElement('tr');
    const safeName = (user.name || 'Sem Nome').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const methodStr = (user.method || 'email').toUpperCase();

    let subStatusHTML = '<span class="badge-status inactive">Inativa</span>';
    
    if (user.sub_active === 1) {
      const planNames = { 1: 'Bronze', 2: 'Prata', 3: 'Ouro' };
      const planName = planNames[user.sub_plan_id] || 'Plano';
      
      let detailsHTML = '';
      if (user.sub_expires_at) {
        const expires = new Date(user.sub_expires_at);
        const now = new Date();
        const diffMs = expires - now;

        if (diffMs > 0) {
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          
          let timeLeft = '';
          if (diffDays > 0) {
            timeLeft = `${diffDays}d ${diffHours}h restantes`;
          } else {
            timeLeft = `${diffHours}h restantes`;
          }
          
          subStatusHTML = `<span class="badge-status active">Ativa (${planName})</span><div class="sub-info-detail">⏳ ${timeLeft}</div>`;
        } else {
          subStatusHTML = `<span class="badge-status expired">Expirada (${planName})</span><div class="sub-info-detail">Expirado em ${expires.toLocaleDateString('pt-BR')}</div>`;
        }
      } else {
        subStatusHTML = `<span class="badge-status active">Ativa (${planName})</span><div class="sub-info-detail">♾️ Vitalício</div>`;
      }

      if (user.sub_activated_at) {
        subStatusHTML += `<div class="sub-info-detail" style="font-size:0.7rem;">Ativo em: ${new Date(user.sub_activated_at).toLocaleDateString('pt-BR')}</div>`;
      }
    }

    const subActionBtnHTML = `<button class="btn-icon" title="Gerenciar Assinatura Manual" style="background: rgba(255, 215, 0, 0.15); border-color: var(--color-gold-bright); color: var(--color-gold-bright);" onclick="openSubAdvancedModal(${user.id})">💳</button>`;
    
    tr.innerHTML = `
      <td>${user.id}</td>
      <td><strong>${user.name || 'Sem Nome'}</strong></td>
      <td>${user.email || '<span style="color: var(--color-text-muted);">Não fornecido</span>'}</td>
      <td><span style="font-weight: 500; color: ${methodStr === 'DISCORD' ? '#5865F2' : '#FFD700'};">${methodStr}</span></td>
      <td>${user.discord_tag || '-'}</td>
      <td>${subStatusHTML}</td>
      <td>${user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(user.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
      <td>
        <div class="actions-cell">
          ${subActionBtnHTML}
          <button class="btn-icon" title="Ver Perfis" onclick="openProfilesModal(${user.id}, '${safeName}')">👥</button>
          <button class="btn-icon delete" title="Excluir Conta" onclick="deleteUser(${user.id}, '${safeName}')">🗑️</button>
        </div>
      </td>
    `;
    usersTbody.appendChild(tr);
  });
}

window.deleteUser = async function(id, name) {
  if (!confirm(`Tem certeza de que deseja excluir permanentemente a conta de "${name}"?`)) return;

  const token = getAdminToken();
  try {
    const res = await fetch(`${API}/api/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      showToast(`✕ Conta de "${name}" excluída.`);
      loadDashboardData();
    } else {
      const data = await res.json();
      showToast(data.error || 'Erro ao excluir usuário');
    }
  } catch {
    showToast('Erro de rede ao excluir usuário');
  }
};

// =============================================
//  TABELA DE FILMES
// =============================================
function renderMoviesTable() {
  moviesTbody.innerHTML = '';

  const query = ($('search-movies')?.value || '').toLowerCase().trim();
  const filteredMovies = movies.filter(movie => {
    return movie.title.toLowerCase().includes(query) ||
           movie.genre.toLowerCase().includes(query) ||
           movie.director.toLowerCase().includes(query) ||
           movie.cast.toLowerCase().includes(query) ||
           movie.category.toLowerCase().includes(query) ||
           getMovieType(movie).includes(query) ||
           String(movie.year) === query;
  });

  if (filteredMovies.length === 0) {
    moviesTbody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--color-text-muted);">Nenhum filme correspondente encontrado.</td></tr>`;
    return;
  }

  filteredMovies.forEach(movie => {
    const type = getMovieType(movie);
    const typeLabel = type === 'series' ? 'Serie' : 'Filme';
    const manageEpisodesBtn = type === 'series'
      ? `<button class="btn-icon" title="Gerenciar Episodios" onclick="openEpisodesModal(${movie.id})">Eps</button>`
      : '';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <img src="${movie.poster.startsWith('http') ? movie.poster : '/' + movie.poster}" alt="Poster" class="poster-thumb">
      </td>
      <td><strong>${movie.title}</strong></td>
      <td><span class="type-badge ${type}">${typeLabel}</span></td>
      <td>${movie.year}</td>
      <td>${type === 'series' ? '-' : movie.duration}</td>
      <td>⭐ ${movie.rating.toFixed(1)}</td>
      <td><span style="color: var(--color-gold-bright); font-weight: 500;">${movie.category}</span></td>
      <td>
        <div class="actions-cell">
          ${manageEpisodesBtn}
          <button class="btn-icon" title="Editar Filme" onclick="openEditModal(${movie.id})">✏️</button>
          <button class="btn-icon delete" title="Excluir Filme" onclick="deleteMovie(${movie.id})">🗑️</button>
        </div>
      </td>
    `;
    moviesTbody.appendChild(tr);
  });
}

// DELETAR FILME
window.deleteMovie = async function(id, title) {
  title = title || movies.find(m => m.id === id)?.title || 'titulo';
  if (!confirm(`Excluir o filme "${title}" do catálogo?`)) return;

  const token = getAdminToken();
  try {
    const res = await fetch(`${API}/api/movies/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      showToast(`✕ Filme "${title}" excluído com sucesso.`);
      loadDashboardData();
    } else {
      const data = await res.json();
      showToast(data.error || 'Erro ao excluir filme');
    }
  } catch {
    showToast('Erro de rede ao excluir filme');
  }
};

// =============================================
//  MODAL FILME (ADD / EDIT)
// =============================================
function openMovieModal(isEdit = false) {
  movieModal.classList.add('open');
  movieModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  if (!isEdit) {
    modalTitle.textContent = 'Cadastrar Novo Filme';
    movieForm.reset();
    $('movie-id').value = '';
    $('m-type').value = 'movie';
    updateMovieTypeFields();
  }
}

function closeMovieModal() {
  movieModal.classList.remove('open');
  movieModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

btnAddMovie.addEventListener('click', () => openMovieModal(false));
btnCancelMovie.addEventListener('click', closeMovieModal);
modalCloseBtn.addEventListener('click', closeMovieModal);
movieModal.addEventListener('click', (e) => {
  if (e.target === movieModal) closeMovieModal();
});

function updateMovieTypeFields() {
  const isSeries = $('m-type').value === 'series';
  const durationGroup = $('movie-duration-group');
  const videoGroup = $('movie-video-group');
  durationGroup?.classList.toggle('is-hidden', isSeries);
  videoGroup?.classList.toggle('is-hidden', isSeries);
  $('m-duration').required = !isSeries;
  $('m-videoUrl').required = !isSeries;
  if (isSeries) {
    $('m-duration').value = $('m-duration').value || 'Serie';
    $('m-videoUrl').value = '';
  }
  $('btn-save-movie').textContent = isSeries ? 'Salvar Serie' : 'Salvar Filme';
}

$('m-type')?.addEventListener('change', updateMovieTypeFields);

// EDIT MOVIE - PRE-FILL FORM
window.openEditModal = function(id) {
  const movie = movies.find(m => m.id === id);
  if (!movie) return;

  modalTitle.textContent = 'Editar Dados do Filme';
  
  $('movie-id').value = movie.id;
  $('m-type').value = getMovieType(movie);
  $('m-title').value = movie.title;
  $('m-year').value = movie.year;
  $('m-duration').value = movie.duration;
  $('m-rating').value = movie.rating;
  $('m-genre').value = movie.genre;
  $('m-category').value = movie.category;
  $('m-poster').value = movie.poster;
  $('m-backdrop').value = movie.backdrop;
  $('m-director').value = movie.director;
  $('m-cast').value = movie.cast;
  $('m-videoUrl').value = movie.videoUrl || movie.videourl || '';
  $('m-desc').value = movie.desc;
  updateMovieTypeFields();

  openMovieModal(true);
};

// SUBMIT FORM (CREATE OR UPDATE)
movieForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = $('movie-id').value;
  const token = getAdminToken();
  const type = $('m-type').value === 'series' ? 'series' : 'movie';
  const isSeries = type === 'series';

  const payload = {
    type,
    title: $('m-title').value.trim(),
    year: parseInt($('m-year').value),
    duration: isSeries ? ($('m-duration').value.trim() || 'Serie') : $('m-duration').value.trim(),
    rating: parseFloat($('m-rating').value),
    genre: $('m-genre').value.trim(),
    category: $('m-category').value,
    poster: $('m-poster').value.trim(),
    backdrop: $('m-backdrop').value.trim(),
    director: $('m-director').value.trim(),
    cast: $('m-cast').value.trim(),
    videoUrl: isSeries ? '' : $('m-videoUrl').value.trim(),
    desc: $('m-desc').value.trim(),
  };

  // Validar se todos os campos estão preenchidos
  let formsValid = true;
  Object.keys(payload).forEach(key => {
    if (isSeries && (key === 'duration' || key === 'videoUrl')) return;
    if (!payload[key] && payload[key] !== 0) {
      formsValid = false;
    }
  });

  if (!formsValid) {
    showToast('⚠️ Todos os campos são obrigatórios.');
    return;
  }

  const isEdit = !!id;
  const url = isEdit ? `${API}/api/movies/${id}` : `${API}/api/movies`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (res.ok) {
      showToast(isEdit ? '✓ Dados do filme atualizados!' : '✓ Filme adicionado ao catálogo!');
      closeMovieModal();
      loadDashboardData();
    } else {
      showToast(data.error || 'Erro ao processar filme');
    }
  } catch {
    showToast('Erro de rede ao salvar filme');
  }
});

// =============================================
//  MODAL EPISODIOS
// =============================================
function closeEpisodesModal() {
  episodesModal.classList.remove('open');
  episodesModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  currentSeriesId = null;
  currentSeriesTitle = '';
  currentEpisodes = [];
}

function resetEpisodeForm(season = 1) {
  episodeForm.reset();
  $('episode-id').value = '';
  $('e-season').value = season;
  $('e-number').value = '';
  $('btn-save-episode').textContent = 'Salvar Episodio';
}

function updateEpisodeSeasonFilter() {
  const seasons = [...new Set(currentEpisodes.map(ep => Number(ep.season)))].sort((a, b) => a - b);
  const formSeason = Number($('e-season').value) || 1;
  if (!seasons.includes(formSeason)) seasons.push(formSeason);
  seasons.sort((a, b) => a - b);

  const currentValue = Number(episodeSeasonFilter.value) || seasons[0];
  episodeSeasonFilter.innerHTML = seasons
    .map(season => `<option value="${season}">Temporada ${season}</option>`)
    .join('');
  episodeSeasonFilter.value = seasons.includes(currentValue) ? currentValue : seasons[0];
}

function renderEpisodesList() {
  updateEpisodeSeasonFilter();
  const selectedSeason = Number(episodeSeasonFilter.value) || 1;
  const episodes = currentEpisodes.filter(ep => Number(ep.season) === selectedSeason);

  if (episodes.length === 0) {
    episodesList.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); padding: 20px;">Nenhum episodio cadastrado nesta temporada.</div>`;
    return;
  }

  episodesList.innerHTML = episodes.map(ep => `
    <div class="episode-row">
      <div class="episode-index">E${ep.number}</div>
      <div>
        <div class="episode-title">${escapeHtml(ep.title)}</div>
        <div class="episode-desc">${escapeHtml(ep.desc || 'Sem descricao.')}</div>
      </div>
      <div class="episode-duration">${escapeHtml(ep.duration)}</div>
      <div class="actions-cell">
        <button class="btn-icon" title="Editar Episodio" onclick="editEpisode(${ep.id})">✏️</button>
        <button class="btn-icon delete" title="Excluir Episodio" onclick="deleteEpisode(${ep.id})">🗑️</button>
      </div>
    </div>
  `).join('');
}

async function loadEpisodes() {
  if (!currentSeriesId) return;
  episodesList.innerHTML = `<div style="text-align: center; color: var(--color-text-muted); padding: 20px;">Carregando episodios...</div>`;

  try {
    const res = await fetch(`${API}/api/movies/${currentSeriesId}/episodes`);
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Erro ao carregar episodios');
      return;
    }
    currentEpisodes = data.episodes || [];
    renderEpisodesList();
  } catch {
    showToast('Erro de rede ao carregar episodios');
  }
}

window.openEpisodesModal = async function(movieId) {
  const movie = movies.find(m => m.id === movieId);
  if (!movie || getMovieType(movie) !== 'series') return;

  currentSeriesId = movieId;
  currentSeriesTitle = movie.title;
  episodesModalTitle.textContent = `Episodios: ${movie.title}`;
  episodesModal.classList.add('open');
  episodesModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  resetEpisodeForm(1);
  await loadEpisodes();
};

window.editEpisode = function(episodeId) {
  const ep = currentEpisodes.find(item => item.id === episodeId);
  if (!ep) return;

  $('episode-id').value = ep.id;
  $('e-season').value = ep.season;
  $('e-number').value = ep.number;
  $('e-title').value = ep.title;
  $('e-duration').value = ep.duration;
  $('e-videoUrl').value = ep.videoUrl || ep.videourl || '';
  $('e-desc').value = ep.desc || '';
  $('btn-save-episode').textContent = 'Atualizar Episodio';
};

window.deleteEpisode = async function(episodeId, title) {
  title = title || currentEpisodes.find(ep => ep.id === episodeId)?.title || 'episodio';
  if (!confirm(`Excluir o episodio "${title}"?`)) return;

  try {
    const res = await fetch(`${API}/api/episodes/${episodeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${getAdminToken()}` }
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Erro ao excluir episodio');
      return;
    }
    showToast('Episodio excluido com sucesso.');
    await loadEpisodes();
  } catch {
    showToast('Erro de rede ao excluir episodio');
  }
};

episodeForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentSeriesId) return;

  const episodeId = $('episode-id').value;
  const payload = {
    season: parseInt($('e-season').value),
    number: parseInt($('e-number').value),
    title: $('e-title').value.trim(),
    duration: $('e-duration').value.trim(),
    videoUrl: $('e-videoUrl').value.trim(),
    desc: $('e-desc').value.trim()
  };

  if (!payload.season || !payload.number || !payload.title || !payload.duration || !payload.videoUrl) {
    showToast('Preencha temporada, numero, titulo, duracao e video.');
    return;
  }

  const isEdit = !!episodeId;
  const url = isEdit ? `${API}/api/episodes/${episodeId}` : `${API}/api/movies/${currentSeriesId}/episodes`;
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminToken()}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      showToast(data.error || 'Erro ao salvar episodio');
      return;
    }
    showToast(isEdit ? 'Episodio atualizado.' : 'Episodio cadastrado.');
    resetEpisodeForm(payload.season);
    episodeSeasonFilter.value = payload.season;
    await loadEpisodes();
  } catch {
    showToast('Erro de rede ao salvar episodio');
  }
});

episodeSeasonFilter?.addEventListener('change', () => {
  $('e-season').value = episodeSeasonFilter.value;
  renderEpisodesList();
});

btnNewSeason?.addEventListener('click', () => {
  const seasons = currentEpisodes.map(ep => Number(ep.season));
  const nextSeason = seasons.length ? Math.max(...seasons) + 1 : 1;
  resetEpisodeForm(nextSeason);
  episodeSeasonFilter.innerHTML += `<option value="${nextSeason}">Temporada ${nextSeason}</option>`;
  episodeSeasonFilter.value = nextSeason;
  renderEpisodesList();
});

btnClearEpisode?.addEventListener('click', () => resetEpisodeForm(Number(episodeSeasonFilter.value) || 1));
episodesModalCloseBtn?.addEventListener('click', closeEpisodesModal);
episodesModal?.addEventListener('click', (e) => {
  if (e.target === episodesModal) closeEpisodesModal();
});

// =============================================
//  PARTICLES BACKGROUND
// =============================================
function createParticles() {
  const container = $('bg-particles');
  if (!container) return;
  for (let i = 0; i < 15; i++) {
    const dot = document.createElement('div');
    dot.className = 'p-dot';
    // Estilos de animação customizados no css
    const size = Math.random() * 2 + 1;
    dot.style.cssText = `
      position: absolute;
      background: rgba(212, 175, 55, ${Math.random() * 0.15 + 0.05});
      border-radius: 50%;
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      top: ${Math.random() * 100}%;
    `;
    container.appendChild(dot);
  }
}

// ---- GERENCIAMENTO DE PERFIS (ADMIN) ----
let currentSelectedUserIdForProfiles = null;
let currentUserProfilesList = [];

window.openProfilesModal = async function(userId, userName) {
  currentSelectedUserIdForProfiles = userId;
  $('profiles-modal-title').textContent = `Perfis de: ${userName}`;
  hideProfileAdminForm();
  
  const modal = $('profiles-modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  await loadUserProfiles(userId);
};

function closeProfilesModal() {
  const modal = $('profiles-modal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  currentSelectedUserIdForProfiles = null;
}

async function loadUserProfiles(userId) {
  const token = getAdminToken();
  const listContainer = $('profiles-list-admin');
  listContainer.innerHTML = '<div style="text-align: center; color: var(--color-text-muted);">Carregando perfis...</div>';

  try {
    const res = await fetch(`${API}/api/admin/users/${userId}/profiles`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    currentUserProfilesList = data.profiles || [];
    renderUserProfilesList();
  } catch (err) {
    listContainer.innerHTML = '<div style="text-align: center; color: var(--color-error);">Erro ao carregar perfis.</div>';
  }
}

function renderUserProfilesList() {
  const listContainer = $('profiles-list-admin');
  listContainer.innerHTML = '';

  if (currentUserProfilesList.length === 0) {
    listContainer.innerHTML = '<div style="text-align: center; color: var(--color-text-muted); padding: 10px;">Esta conta não possui perfis cadastrados.</div>';
    return;
  }

  currentUserProfilesList.forEach(profile => {
    const item = document.createElement('div');
    item.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.06);
      padding: 12px 16px;
      border-radius: 10px;
    `;

    const details = document.createElement('div');
    details.style.cssText = `
      display: flex;
      align-items: center;
      gap: 12px;
    `;

    const avatar = document.createElement('div');
    avatar.textContent = profile.avatar_icon;
    avatar.style.cssText = `
      width: 44px;
      height: 44px;
      border-radius: 8px;
      background: ${profile.avatar_color}22;
      border: 2px solid ${profile.avatar_color}66;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    `;

    const info = document.createElement('div');
    info.innerHTML = `
      <div style="font-weight: 600; color: var(--color-text-light);">${profile.name}</div>
      <div style="font-size: 0.75rem; color: var(--color-text-muted);">${profile.is_kid ? '👶 Perfil Infantil' : '🎬 Acesso Completo'}</div>
    `;

    details.appendChild(avatar);
    details.appendChild(info);

    const actions = document.createElement('div');
    actions.className = 'actions-cell';
    
    const btnEdit = document.createElement('button');
    btnEdit.className = 'btn-icon';
    btnEdit.title = 'Editar Perfil';
    btnEdit.innerHTML = '✏️';
    btnEdit.onclick = () => showEditProfileAdminForm(profile);

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn-icon delete';
    btnDelete.title = 'Excluir Perfil';
    btnDelete.innerHTML = '🗑️';
    btnDelete.onclick = () => deleteProfileAdmin(profile.id, profile.name);

    actions.appendChild(btnEdit);
    actions.appendChild(btnDelete);

    item.appendChild(details);
    item.appendChild(actions);
    listContainer.appendChild(item);
  });
}

function showCreateProfileAdminForm() {
  const form = $('add-profile-admin-form');
  form.classList.remove('hidden');
  $('profile-form-title').textContent = 'Adicionar Novo Perfil';
  $('admin-profile-id').value = '';
  $('ap-name').value = '';
  $('ap-icon').value = '🎬';
  $('ap-color').value = '#FFD700';
  $('ap-kid').checked = false;
  $('ap-name').focus();
}

function showEditProfileAdminForm(profile) {
  const form = $('add-profile-admin-form');
  form.classList.remove('hidden');
  $('profile-form-title').textContent = 'Editar Perfil';
  $('admin-profile-id').value = profile.id;
  $('ap-name').value = profile.name;
  $('ap-icon').value = profile.avatar_icon;
  $('ap-color').value = profile.avatar_color;
  $('ap-kid').checked = !!profile.is_kid;
  $('ap-name').focus();
}

function hideProfileAdminForm() {
  const form = $('add-profile-admin-form');
  form.classList.add('hidden');
  $('admin-profile-id').value = '';
  $('ap-name').value = '';
}

async function deleteProfileAdmin(profileId, profileName) {
  if (!confirm(`Excluir permanentemente o perfil "${profileName}"?`)) return;
  const token = getAdminToken();

  try {
    const res = await fetch(`${API}/api/admin/profiles/${profileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      showToast(`✕ Perfil "${profileName}" excluído.`);
      await loadUserProfiles(currentSelectedUserIdForProfiles);
    } else {
      const data = await res.json();
      showToast(data.error || 'Erro ao excluir perfil.');
    }
  } catch {
    showToast('Erro de rede ao excluir perfil.');
  }
}

async function saveProfileAdmin() {
  const name = $('ap-name').value.trim();
  const icon = $('ap-icon').value;
  const color = $('ap-color').value;
  const isKid = $('ap-kid').checked;
  const profileId = $('admin-profile-id').value;
  const token = getAdminToken();

  if (!name) {
    showToast('⚠️ Nome do perfil é obrigatório.');
    return;
  }

  const isEdit = !!profileId;
  const url = isEdit 
    ? `${API}/api/admin/profiles/${profileId}` 
    : `${API}/api/admin/users/${currentSelectedUserIdForProfiles}/profiles`;
  
  const method = isEdit ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name,
        avatar_icon: icon,
        avatar_color: color,
        is_kid: isKid ? 1 : 0
      })
    });

    const data = await res.json();
    if (res.ok) {
      showToast(isEdit ? '✓ Perfil atualizado com sucesso!' : '✓ Perfil criado com sucesso!');
      hideProfileAdminForm();
      await loadUserProfiles(currentSelectedUserIdForProfiles);
    } else {
      showToast(data.error || 'Erro ao salvar perfil.');
    }
  } catch {
    showToast('Erro de rede ao salvar perfil.');
  }
}

// Bind modal events
$('profiles-modal-close-btn')?.addEventListener('click', closeProfilesModal);
$('btn-close-profiles-modal')?.addEventListener('click', closeProfilesModal);
$('btn-add-profile-admin')?.addEventListener('click', () => {
  if (currentUserProfilesList.length >= 5) {
    showToast('⚠️ Limite máximo de 5 perfis atingido.');
    return;
  }
  showCreateProfileAdminForm();
});
$('btn-cancel-profile-admin')?.addEventListener('click', hideProfileAdminForm);
$('btn-save-profile-admin')?.addEventListener('click', saveProfileAdmin);

// ---- CONTROLE DE ASSINATURAS E PLANOS AVANÇADO (ADMIN) ----

window.openSubAdvancedModal = function(userId) {
  const user = users.find(u => u.id === userId);
  if (!user) return;

  subAdvUserId.value = userId;
  subAdvActive.checked = user.sub_active === 1;
  subAdvPlanId.value = user.sub_plan_id || "1";

  // Formatar datas para datetime-local (yyyy-MM-ddThh:mm)
  const formatForInput = (isoString) => {
    if (!isoString) return "";
    const d = new Date(isoString);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Se tem plano, preencher as datas existentes, senão sugerir datas padrão
  if (user.sub_active === 1) {
    subAdvStart.value = formatForInput(user.sub_activated_at);
    subAdvEnd.value = formatForInput(user.sub_expires_at);
  } else {
    const now = new Date();
    const oneMonthLater = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    subAdvStart.value = formatForInput(now.toISOString());
    subAdvEnd.value = formatForInput(oneMonthLater.toISOString());
  }

  // Monitorar checkbox para ocultar/mostrar datas
  const toggleDateFields = () => {
    const show = subAdvActive.checked;
    $('sub-adv-plan-group').style.display = show ? 'block' : 'none';
    $('sub-adv-dates-group').style.display = show ? 'block' : 'none';
  };
  subAdvActive.onchange = toggleDateFields;
  toggleDateFields();

  subAdvancedModal.classList.add('open');
  subAdvancedModal.setAttribute('aria-hidden', 'false');
};

window.closeSubAdvancedModal = function() {
  subAdvancedModal.classList.remove('open');
  subAdvancedModal.setAttribute('aria-hidden', 'true');
};

subAdvancedForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const userId = subAdvUserId.value;
  const active = subAdvActive.checked;
  const planId = subAdvPlanId.value;
  
  // Converter as datas do input de volta para ISOString
  const activatedAt = subAdvStart.value ? new Date(subAdvStart.value).toISOString() : null;
  const expiresAt = subAdvEnd.value ? new Date(subAdvEnd.value).toISOString() : null;

  const token = getAdminToken();

  try {
    const res = await fetch(`${API}/api/admin/users/${userId}/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ active, planId, activatedAt, expiresAt })
    });

    if (res.ok) {
      showToast(active ? "✓ Plano ativado com sucesso!" : "✓ Assinatura removida.");
      closeSubAdvancedModal();
      loadDashboardData();
    } else {
      const data = await res.json();
      showToast(data.error || "Erro ao atualizar plano.");
    }
  } catch {
    showToast("Erro de rede ao salvar plano.");
  }
});

btnCancelSubAdv.addEventListener('click', closeSubAdvancedModal);
subAdvCloseBtn.addEventListener('click', closeSubAdvancedModal);

// ---- DYNAMIC PLAN CRUD & RENDERING (ADMIN) ----

window.renderPlansTable = function() {
  plansTbody.innerHTML = '';

  if (plans.length === 0) {
    plansTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--color-text-muted);">Nenhum plano cadastrado.</td></tr>`;
    return;
  }

  plans.forEach(plan => {
    const tr = document.createElement('tr');
    
    // Planos padrão 1, 2 e 3 não podem ser excluídos para manter consistência simples
    const isDefault = plan.id <= 3;
    const deleteBtn = isDefault 
      ? `<button class="btn-icon delete" style="opacity: 0.3; cursor: not-allowed;" title="Planos padrão não podem ser excluídos" disabled>🗑️</button>`
      : `<button class="btn-icon delete" title="Excluir Plano" onclick="deletePlan(${plan.id}, '${plan.name}')">🗑️</button>`;

    tr.innerHTML = `
      <td>${plan.id}</td>
      <td><strong>${plan.name}</strong></td>
      <td>R$ ${parseFloat(plan.price).toFixed(2)}</td>
      <td>${plan.screens} ${plan.screens === 1 ? 'Tela' : 'Telas'}</td>
      <td>${plan.duration_days} dias</td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" title="Editar Plano" onclick="openPlanModal(${plan.id})">✏️</button>
          ${deleteBtn}
        </div>
      </td>
    `;
    plansTbody.appendChild(tr);
  });
};

window.openPlanModal = function(planId = null) {
  if (planId) {
    // Editar
    const plan = plans.find(p => p.id === planId);
    if (!plan) return;

    planModalTitle.textContent = "Editar Plano";
    planIdField.value = plan.id;
    pNameInput.value = plan.name;
    pPriceInput.value = plan.price;
    pScreensInput.value = plan.screens;
    pDurationInput.value = plan.duration_days;
  } else {
    // Cadastrar Novo
    planModalTitle.textContent = "Cadastrar Novo Plano";
    planIdField.value = "";
    pNameInput.value = "";
    pPriceInput.value = "";
    pScreensInput.value = "";
    pDurationInput.value = "30"; // Sugerir 30 dias (mensal)
  }

  planModal.classList.add('open');
  planModal.setAttribute('aria-hidden', 'false');
};

window.closePlanModal = function() {
  planModal.classList.remove('open');
  planModal.setAttribute('aria-hidden', 'true');
};

// Enviar Formulário de Planos (Cadastrar ou Editar)
planForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = planIdField.value;
  const name = pNameInput.value.trim();
  const price = parseFloat(pPriceInput.value);
  const screens = parseInt(pScreensInput.value);
  const duration_days = parseInt(pDurationInput.value);

  if (!name || isNaN(price) || isNaN(screens) || isNaN(duration_days)) {
    showToast("⚠️ Todos os campos devem ser preenchidos corretamente.");
    return;
  }

  const token = getAdminToken();
  const url = id ? `${API}/api/admin/plans/${id}` : `${API}/api/admin/plans`;
  const method = id ? 'PUT' : 'POST';

  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, price, screens, duration_days })
    });

    if (res.ok) {
      showToast(id ? "✓ Plano atualizado com sucesso!" : "✓ Novo plano cadastrado com sucesso!");
      closePlanModal();
      loadDashboardData();
    } else {
      const data = await res.json();
      showToast(data.error || "Erro ao salvar plano.");
    }
  } catch {
    showToast("Erro de rede ao salvar plano.");
  }
});

// Deletar Plano
window.deletePlan = async function(planId, name) {
  if (!confirm(`Tem certeza que deseja excluir o plano "${name}"?`)) return;

  const token = getAdminToken();
  try {
    const res = await fetch(`${API}/api/admin/plans/${planId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if (res.ok) {
      showToast("✓ Plano excluído com sucesso!");
      loadDashboardData();
    } else {
      const data = await res.json();
      showToast(data.error || "Erro ao excluir plano.");
    }
  } catch {
    showToast("Erro de rede ao excluir plano.");
  }
};

btnCancelPlan.addEventListener('click', closePlanModal);
planModalCloseBtn.addEventListener('click', closePlanModal);
$('btn-add-plan')?.addEventListener('click', () => openPlanModal());

// ---- TABELA DE COBRANÇAS E LOGS ----
function renderPaymentsTable() {
  paymentsTbody.innerHTML = '';

  const query = ($('search-payments')?.value || '').toLowerCase().trim();
  const filteredLogs = paymentLogs.filter(log => {
    const userName = (log.user_name || '').toLowerCase();
    const userEmail = (log.user_email || '').toLowerCase();
    const planName = (log.plan_name || '').toLowerCase();
    const txid = (log.txid || '').toLowerCase();
    const status = (log.status || '').toLowerCase();
    
    return userName.includes(query) || 
           userEmail.includes(query) ||
           planName.includes(query) ||
           txid.includes(query) ||
           status.includes(query);
  });

  if (filteredLogs.length === 0) {
    paymentsTbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--color-text-muted);">Nenhuma transação correspondente encontrada.</td></tr>`;
    return;
  }

  filteredLogs.forEach(log => {
    const tr = document.createElement('tr');
    
    const formatDateTime = (isoString) => {
      if (!isoString) return '-';
      const d = new Date(isoString);
      return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    let statusBadge = '';
    if (log.status === 'paid') {
      statusBadge = '<span class="badge-status paid">Confirmado</span>';
    } else if (log.status === 'pending') {
      statusBadge = '<span class="badge-status pending">Pendente</span>';
    } else {
      statusBadge = `<span class="badge-status expired">${log.status}</span>`;
    }

    tr.innerHTML = `
      <td>${log.id}</td>
      <td><strong>${log.user_name || 'Desconhecido'}</strong></td>
      <td>${log.user_email || '-'}</td>
      <td>${log.plan_name || `Plano ${log.plan_id}`}</td>
      <td>R$ ${parseFloat(log.amount).toFixed(2)}</td>
      <td><span style="font-family: monospace; font-size: 0.8rem; background:rgba(255,255,255,0.03); padding:4px 8px; border-radius:4px;">${log.txid || '-'}</span></td>
      <td>${statusBadge}</td>
      <td>${formatDateTime(log.created_at)}</td>
      <td>${formatDateTime(log.paid_at)}</td>
    `;
    paymentsTbody.appendChild(tr);
  });
}

// ---- INIT ----
createParticles();
checkAdminAuth();
window.addEventListener('storage', checkAdminAuth);

// SEARCH LISTENERS (Real-time Filtering)
$('search-movies')?.addEventListener('input', renderMoviesTable);
$('search-users')?.addEventListener('input', renderUsersTable);
$('search-payments')?.addEventListener('input', renderPaymentsTable);

// ---- PERSONALIZAÇÃO DO SITE (LOGOTIPO E FAVICON) ----
let uploadedLogoBase64 = null;
let uploadedFaviconBase64 = null;

// Lógica do Logotipo
$('input-logo-file')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    uploadedLogoBase64 = evt.target.result;
    const preview = $('preview-logo');
    if (preview) preview.src = uploadedLogoBase64;
    
    const saveBtn = $('btn-save-logo');
    if (saveBtn) saveBtn.removeAttribute('disabled');
  };
  reader.readAsDataURL(file);
});

$('btn-save-logo')?.addEventListener('click', async function() {
  if (!uploadedLogoBase64) return;
  
  const btn = $('btn-save-logo');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const token = getAdminToken();
  try {
    const res = await fetch(`${API}/api/admin/settings/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ type: 'logo', fileData: uploadedLogoBase64 })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('✓ Logotipo atualizado com sucesso! Atualize a página do site para ver.');
      btn.textContent = 'Salvar Logotipo';
    } else {
      showToast(data.error || 'Erro ao enviar logotipo.');
      btn.disabled = false;
      btn.textContent = 'Salvar Logotipo';
    }
  } catch (err) {
    showToast('Erro de conexão ao salvar logotipo.');
    btn.disabled = false;
    btn.textContent = 'Salvar Logotipo';
  }
});

// Lógica do Favicon
$('input-favicon-file')?.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    uploadedFaviconBase64 = evt.target.result;
    const preview = $('preview-favicon');
    if (preview) preview.src = uploadedFaviconBase64;

    const saveBtn = $('btn-save-favicon');
    if (saveBtn) saveBtn.removeAttribute('disabled');
  };
  reader.readAsDataURL(file);
});

$('btn-save-favicon')?.addEventListener('click', async function() {
  if (!uploadedFaviconBase64) return;

  const btn = $('btn-save-favicon');
  btn.disabled = true;
  btn.textContent = 'Enviando...';

  const token = getAdminToken();
  try {
    const res = await fetch(`${API}/api/admin/settings/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ type: 'favicon', fileData: uploadedFaviconBase64 })
    });

    const data = await res.json();
    if (res.ok) {
      showToast('✓ Favicon atualizado com sucesso! Atualize a página do site para ver.');
      btn.textContent = 'Salvar Favicon';
    } else {
      showToast(data.error || 'Erro ao enviar favicon.');
      btn.disabled = false;
      btn.textContent = 'Salvar Favicon';
    }
  } catch (err) {
    showToast('Erro de conexão ao salvar favicon.');
    btn.disabled = false;
    btn.textContent = 'Salvar Favicon';
  }
});
$('search-payments')?.addEventListener('input', renderPaymentsTable);
