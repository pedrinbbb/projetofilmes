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
const sectionMovies = $('section-movies');
const sectionUsers = $('section-users');

const moviesTbody = $('movies-list-tbody');
const usersTbody = $('users-list-tbody');

const movieModal = $('movie-modal');
const movieForm = $('movie-form');
const modalTitle = $('modal-title');
const btnAddMovie = $('btn-add-movie');
const btnCancelMovie = $('btn-cancel-movie');
const modalCloseBtn = $('modal-close-btn');

// ---- STATE ----
let movies = [];
let users = [];

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
  if (target === 'movies') {
    tabMoviesBtn.classList.add('active');
    tabUsersBtn.classList.remove('active');
    sectionMovies.classList.add('active');
    sectionUsers.classList.remove('active');
  } else {
    tabMoviesBtn.classList.remove('active');
    tabUsersBtn.classList.add('active');
    sectionMovies.classList.remove('active');
    sectionUsers.classList.add('active');
  }
}

tabMoviesBtn.addEventListener('click', () => switchTab('movies'));
tabUsersBtn.addEventListener('click', () => switchTab('users'));

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
}

// =============================================
//  TABELA DE USUÁRIOS
// =============================================
function renderUsersTable() {
  usersTbody.innerHTML = '';
  if (users.length === 0) {
    usersTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">Nenhum usuário cadastrado.</td></tr>`;
    return;
  }

  users.forEach(user => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${user.id}</td>
      <td><strong>${user.name}</strong></td>
      <td>${user.email || '<span style="color: var(--color-text-muted);">Não fornecido</span>'}</td>
      <td><span style="font-weight: 500; color: ${user.method === 'discord' ? '#5865F2' : '#FFD700'};">${user.method.toUpperCase()}</span></td>
      <td>${user.discord_tag || '-'}</td>
      <td>${new Date(user.created_at).toLocaleDateString('pt-BR')} ${new Date(user.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</td>
      <td>
        <button class="btn-icon delete" title="Excluir Conta" onclick="deleteUser(${user.id}, '${user.name}')">🗑️</button>
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
  if (movies.length === 0) {
    moviesTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">Nenhum filme cadastrado no catálogo.</td></tr>`;
    return;
  }

  movies.forEach(movie => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <img src="${movie.poster.startsWith('http') ? movie.poster : '/' + movie.poster}" alt="Poster" class="poster-thumb">
      </td>
      <td><strong>${movie.title}</strong></td>
      <td>${movie.year}</td>
      <td>${movie.duration}</td>
      <td>⭐ ${movie.rating.toFixed(1)}</td>
      <td><span style="color: var(--color-gold-bright); font-weight: 500;">${movie.category}</span></td>
      <td>
        <div class="actions-cell">
          <button class="btn-icon" title="Editar Filme" onclick="openEditModal(${movie.id})">✏️</button>
          <button class="btn-icon delete" title="Excluir Filme" onclick="deleteMovie(${movie.id}, '${movie.title}')">🗑️</button>
        </div>
      </td>
    `;
    moviesTbody.appendChild(tr);
  });
}

// DELETAR FILME
window.deleteMovie = async function(id, title) {
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

// EDIT MOVIE - PRE-FILL FORM
window.openEditModal = function(id) {
  const movie = movies.find(m => m.id === id);
  if (!movie) return;

  modalTitle.textContent = 'Editar Dados do Filme';
  
  $('movie-id').value = movie.id;
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
  $('m-videoUrl').value = movie.videoUrl;
  $('m-desc').value = movie.desc;

  openMovieModal(true);
};

// SUBMIT FORM (CREATE OR UPDATE)
movieForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const id = $('movie-id').value;
  const token = getAdminToken();

  const payload = {
    title: $('m-title').value.trim(),
    year: parseInt($('m-year').value),
    duration: $('m-duration').value.trim(),
    rating: parseFloat($('m-rating').value),
    genre: $('m-genre').value.trim(),
    category: $('m-category').value,
    poster: $('m-poster').value.trim(),
    backdrop: $('m-backdrop').value.trim(),
    director: $('m-director').value.trim(),
    cast: $('m-cast').value.trim(),
    videoUrl: $('m-videoUrl').value.trim(),
    desc: $('m-desc').value.trim(),
  };

  // Validar se todos os campos estão preenchidos
  let formsValid = true;
  Object.keys(payload).forEach(key => {
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

// ---- INIT ----
createParticles();
checkAdminAuth();
window.addEventListener('storage', checkAdminAuth);
