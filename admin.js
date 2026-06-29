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
    usersTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">Nenhum usuário correspondente encontrado.</td></tr>`;
    return;
  }

  filteredUsers.forEach(user => {
    const tr = document.createElement('tr');
    const safeName = (user.name || 'Sem Nome').replace(/'/g, "\\'").replace(/"/g, '\\"');
    const methodStr = (user.method || 'email').toUpperCase();
    
    tr.innerHTML = `
      <td>${user.id}</td>
      <td><strong>${user.name || 'Sem Nome'}</strong></td>
      <td>${user.email || '<span style="color: var(--color-text-muted);">Não fornecido</span>'}</td>
      <td><span style="font-weight: 500; color: ${methodStr === 'DISCORD' ? '#5865F2' : '#FFD700'};">${methodStr}</span></td>
      <td>${user.discord_tag || '-'}</td>
      <td>${user.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') + ' ' + new Date(user.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
      <td>
        <div class="actions-cell">
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
           String(movie.year) === query;
  });

  if (filteredMovies.length === 0) {
    moviesTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--color-text-muted);">Nenhum filme correspondente encontrado.</td></tr>`;
    return;
  }

  filteredMovies.forEach(movie => {
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

// ---- INIT ----
createParticles();
checkAdminAuth();
window.addEventListener('storage', checkAdminAuth);

// SEARCH LISTENERS (Real-time Filtering)
$('search-movies')?.addEventListener('input', renderMoviesTable);
$('search-users')?.addEventListener('input', renderUsersTable);
