/* =============================================
   GOATCINE — Profiles Page Logic
   ============================================= */

const EMOJIS = ['🎬','🎭','🏆','🌟','👑','🦁','🐺','🦊','🐉','🎮',
                '🎸','🚀','⚡','🔥','🌊','🎯','🦅','🐯','🎪','🌙',
                '🏋️','🎻','🛸','🦋','🎨'];

const COLORS = [
  '#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4',
  '#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE',
  '#85C1E9','#F1948A','#82E0AA','#F8C471','#AEB6BF',
];

let selectedEmoji  = EMOJIS[0];
let selectedColor  = COLORS[0];
let isKid          = false;
let isManageMode   = false;
let profiles       = [];
let isNewUser      = false;
let isSubmitting   = false;

const token = localStorage.getItem('goatcine_token');

// ---- AUTH GUARD ----
(function authGuard() {
  if (!token) {
    window.location.replace('/login.html');
    return;
  }
})();

// ---- PARTICLES ----
function createParticles() {
  const container = document.getElementById('bg-particles');
  if (!container) return;
  for (let i = 0; i < 16; i++) {
    const dot = document.createElement('div');
    dot.className = 'p-dot';
    const size = Math.random() * 2.5 + 1;
    dot.style.cssText = `
      width: ${size}px; height: ${size}px;
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 14 + 8}s;
      animation-delay: ${Math.random() * 12}s;
      --dx: ${(Math.random() - 0.5) * 90}px;
    `;
    container.appendChild(dot);
  }
}

// ---- DOM REFS ----
const selectPanel    = document.getElementById('select-panel');
const createPanel    = document.getElementById('create-panel');
const profilesGrid   = document.getElementById('profiles-grid');
const selectTitle    = document.getElementById('select-title');
const selectError    = document.getElementById('select-error');
const createError    = document.getElementById('create-error');
const manageBtn      = document.getElementById('manage-btn');
const createTitle    = document.getElementById('create-title');
const requiredMsg    = document.getElementById('required-msg');
const previewAvatar  = document.getElementById('preview-avatar');
const nameInput      = document.getElementById('profile-name-input');
const emojiGrid      = document.getElementById('emoji-grid');
const colorGrid      = document.getElementById('color-grid');
const kidToggle      = document.getElementById('kid-toggle');
const cancelBtn      = document.getElementById('create-cancel-btn');
const submitBtn      = document.getElementById('create-submit-btn');

// ---- BUILD PICKERS ----
function buildEmojiPicker() {
  EMOJIS.forEach((emoji, i) => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn' + (i === 0 ? ' selected' : '');
    btn.textContent = emoji;
    btn.type = 'button';
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEmoji = emoji;
      updatePreview();
    });
    emojiGrid.appendChild(btn);
  });
}

function buildColorPicker() {
  COLORS.forEach((color, i) => {
    const btn = document.createElement('button');
    btn.className = 'color-btn' + (i === 0 ? ' selected' : '');
    btn.style.background = color;
    btn.type = 'button';
    btn.title = color;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedColor = color;
      updatePreview();
    });
    colorGrid.appendChild(btn);
  });
}

function updatePreview() {
  previewAvatar.textContent = selectedEmoji;
  previewAvatar.style.background = selectedColor + '22'; // 13% opacity
  previewAvatar.style.borderColor = selectedColor;
  previewAvatar.style.boxShadow = `0 0 28px ${selectedColor}55`;
}

// ---- RENDER PROFILES ----
function renderProfiles() {
  profilesGrid.innerHTML = '';

  profiles.forEach(profile => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.dataset.id = profile.id;

    const avatar = document.createElement('div');
    avatar.className = 'profile-avatar';
    avatar.textContent = profile.avatar_icon;
    avatar.style.background = profile.avatar_color + '22';
    avatar.style.borderColor = profile.avatar_color + '55';

    const name = document.createElement('div');
    name.className = 'profile-name';
    name.textContent = profile.name;

    const delBtn = document.createElement('button');
    delBtn.className = 'profile-delete-btn';
    delBtn.innerHTML = '✕';
    delBtn.title = `Remover perfil "${profile.name}"`;
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteProfile(profile.id, card);
    });

    card.appendChild(avatar);
    card.appendChild(name);
    card.appendChild(delBtn);

    card.addEventListener('click', () => {
      if (isManageMode) return;
      selectProfile(profile);
    });

    profilesGrid.appendChild(card);
  });

  // Add card (only if < 5 profiles and not manage mode)
  if (profiles.length < 5) {
    const addCard = document.createElement('div');
    addCard.className = 'add-profile-card';
    addCard.id = 'add-profile-card';
    addCard.innerHTML = `
      <div class="add-profile-avatar">＋</div>
      <div class="add-profile-name">Adicionar Perfil</div>
    `;
    addCard.addEventListener('click', showCreatePanel);
    profilesGrid.appendChild(addCard);
  }
}

// ---- SELECT PROFILE ----
function selectProfile(profile) {
  localStorage.setItem('goatcine_profile', JSON.stringify({
    id:           profile.id,
    name:         profile.name,
    avatar_icon:  profile.avatar_icon,
    avatar_color: profile.avatar_color,
    is_kid:       profile.is_kid,
  }));
  window.location.href = '/';
}

// ---- DELETE PROFILE ----
async function deleteProfile(profileId, cardEl) {
  if (!confirm('Tem certeza que deseja remover este perfil?')) return;

  try {
    const res = await fetch(`/api/profiles/${profileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const data = await res.json();
      selectError.textContent = data.error || 'Erro ao remover perfil.';
      return;
    }

    // Animate out
    cardEl.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    cardEl.style.opacity = '0';
    cardEl.style.transform = 'scale(0.85)';
    setTimeout(() => {
      profiles = profiles.filter(p => p.id !== profileId);
      renderProfiles();
      if (profiles.length === 0) {
        exitManageMode();
        showCreatePanel(true);
      }
    }, 300);

  } catch (err) {
    selectError.textContent = 'Erro de conexão ao remover perfil.';
  }
}

// ---- SHOW CREATE PANEL ----
function showCreatePanel(required = false) {
  selectPanel.classList.add('hidden');
  createPanel.classList.add('active');
  cancelBtn.style.display = profiles.length > 0 ? 'block' : 'none';
  requiredMsg.style.display = required ? 'block' : 'none';

  // Reset form
  nameInput.value = '';
  createError.textContent = '';
  selectedEmoji = EMOJIS[0];
  selectedColor = COLORS[0];
  isKid = false;
  kidToggle.classList.remove('on');
  kidToggle.setAttribute('aria-checked', 'false');
  document.querySelectorAll('.emoji-btn').forEach((b, i) => b.classList.toggle('selected', i === 0));
  document.querySelectorAll('.color-btn').forEach((b, i) => b.classList.toggle('selected', i === 0));
  updatePreview();
  nameInput.focus();
}

// ---- HIDE CREATE PANEL ----
function hideCreatePanel() {
  createPanel.classList.remove('active');
  selectPanel.classList.remove('hidden');
}

// ---- MANAGE MODE ----
function toggleManageMode() {
  isManageMode = !isManageMode;
  document.body.classList.toggle('manage-mode', isManageMode);
  manageBtn.textContent = isManageMode ? 'Concluir' : 'Gerenciar Perfis';
  manageBtn.classList.toggle('active', isManageMode);
  selectTitle.textContent = isManageMode ? 'Gerenciar Perfis' : 'Quem está assistindo?';
}

function exitManageMode() {
  isManageMode = false;
  document.body.classList.remove('manage-mode');
  manageBtn.textContent = 'Gerenciar Perfis';
  manageBtn.classList.remove('active');
  selectTitle.textContent = 'Quem está assistindo?';
}

// ---- CREATE PROFILE ----
async function createProfile() {
  if (isSubmitting) return;

  const name = nameInput.value.trim();
  createError.textContent = '';

  if (!name) {
    createError.textContent = 'Digite um nome para o perfil.';
    nameInput.focus();
    return;
  }

  isSubmitting = true;
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="btn-loading"></span>';

  try {
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name,
        avatar_icon:  selectedEmoji,
        avatar_color: selectedColor,
        is_kid:       isKid ? 1 : 0,
      }),
    });

    let data;
    try {
      data = await res.json();
    } catch {
      createError.textContent = `Erro do servidor (${res.status}). Tente novamente em instantes.`;
      return;
    }

    if (!res.ok) {
      createError.textContent = data.error || 'Erro ao criar perfil.';
      return;
    }

    // Success — go directly to the site with this profile
    const profile = data.profile;
    localStorage.setItem('goatcine_profile', JSON.stringify({
      id:           profile.id,
      name:         profile.name,
      avatar_icon:  profile.avatar_icon,
      avatar_color: profile.avatar_color,
      is_kid:       profile.is_kid,
    }));

    window.location.href = '/';

  } catch (err) {
    createError.textContent = 'Sem conexão com o servidor. Verifique sua internet.';
  } finally {
    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = 'Criar Perfil';
  }
}

// ---- LOAD PROFILES ----
async function loadProfiles() {
  try {
    const res = await fetch('/api/profiles', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      localStorage.removeItem('goatcine_token');
      localStorage.removeItem('goatcine_user');
      localStorage.removeItem('goatcine_profile');
      window.location.replace('/login.html');
      return;
    }

    const data = await res.json();
    profiles = data.profiles || [];

    const params = new URLSearchParams(window.location.search);
    isNewUser = params.get('new') === 'true';

    if (profiles.length === 0) {
      // No profiles: go straight to create form
      showCreatePanel(true);
    } else {
      // Has profiles: show selection grid
      renderProfiles();
    }

  } catch (err) {
    selectError.textContent = 'Erro ao carregar perfis. Verifique sua conexão.';
  }
}

// ---- EVENT LISTENERS ----
manageBtn.addEventListener('click', toggleManageMode);
cancelBtn.addEventListener('click', hideCreatePanel);
submitBtn.addEventListener('click', createProfile);

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') createProfile();
});

kidToggle.addEventListener('click', () => {
  isKid = !isKid;
  kidToggle.classList.toggle('on', isKid);
  kidToggle.setAttribute('aria-checked', String(isKid));
});

kidToggle.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    kidToggle.click();
  }
});

nameInput.addEventListener('input', () => {
  createError.textContent = '';
});

// ---- INIT ----
createParticles();
buildEmojiPicker();
buildColorPicker();
updatePreview();
loadProfiles();
