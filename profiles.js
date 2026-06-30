/* =============================================
   GOATCINE — Profiles Page Logic
   ============================================= */

const PROFILE_IMAGE_AVATARS = [
  {
    url: 'https://i.postimg.cc/HLpy2Qpv/image.png',
    label: 'Avatar real 1'
  },
  {
    url: 'https://i.postimg.cc/G2ts0dTH/image.png',
    label: 'Avatar real 2'
  },
  {
    url: 'https://i.postimg.cc/hv7zjsrf/image.png',
    label: 'Avatar real 3'
  },
  {
    url: 'https://i.postimg.cc/3W5yDGSb/image.png',
    label: 'Avatar real 4'
  },
  {
    url: 'https://i.postimg.cc/tRLDzm8D/image.png',
    label: 'Avatar real 5'
  },
  {
    url: 'https://i.postimg.cc/T3x9z5dp/image.png',
    label: 'Avatar real 6'
  },
  {
    url: 'https://i.postimg.cc/T3QrBkHG/image.png',
    label: 'Avatar real 7'
  }
];

const COLORS = [
  '#FFD700','#FF6B6B','#4ECDC4','#45B7D1','#96CEB4',
  '#FFEAA7','#DDA0DD','#98D8C8','#F7DC6F','#BB8FCE',
  '#85C1E9','#F1948A','#82E0AA','#F8C471','#AEB6BF',
];

let selectedEmoji  = PROFILE_IMAGE_AVATARS[0].url;
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
const pinModal       = document.getElementById('pin-modal');
const pinAvatar      = document.getElementById('pin-avatar');
const pinProfileName = document.getElementById('pin-profile-name');
const pinInput       = document.getElementById('pin-input');
const pinError       = document.getElementById('pin-error');
const pinCancelBtn   = document.getElementById('pin-cancel-btn');
const pinSubmitBtn   = document.getElementById('pin-submit-btn');
let lockedProfile    = null;

function isImageAvatar(value) {
  return /^(https?:\/\/|data:image\/)/i.test(value || '');
}

function setAvatarContent(element, avatarValue, color, altText = 'Avatar do perfil') {
  element.innerHTML = '';

  if (isImageAvatar(avatarValue)) {
    const img = document.createElement('img');
    img.src = avatarValue;
    img.alt = altText;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    img.onerror = () => {
      element.textContent = '🎬';
      element.style.background = color + '22';
    };

    element.appendChild(img);
    element.style.background = '#111111';
    element.style.borderColor = color + '88';
    return;
  }

  element.textContent = avatarValue;
  element.style.background = color + '22';
  element.style.borderColor = color + '55';
}

function persistSelectedProfile(profile) {
  localStorage.setItem('goatcine_profile', JSON.stringify({
    id:           profile.id,
    name:         profile.name,
    avatar_icon:  profile.avatar_icon,
    avatar_color: profile.avatar_color,
    is_kid:       profile.is_kid,
    has_pin:      profile.has_pin,
  }));
}

// ---- BUILD PICKERS ----
function buildEmojiPicker() {
  PROFILE_IMAGE_AVATARS.forEach((avatar, i) => {
    const btn = document.createElement('button');
    btn.className = 'emoji-btn avatar-image-btn' + (i === 0 ? ' selected' : '');
    btn.type = 'button';
    btn.title = avatar.label;
    btn.setAttribute('aria-label', avatar.label);
    setAvatarContent(btn, avatar.url, COLORS[0], avatar.label);
    btn.addEventListener('click', () => {
      document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedEmoji = avatar.url;
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
  setAvatarContent(previewAvatar, selectedEmoji, selectedColor, 'Prévia do avatar');
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
    setAvatarContent(avatar, profile.avatar_icon, profile.avatar_color, `Avatar de ${profile.name}`);

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
  if (profile.has_pin) {
    showPinModal(profile);
    return;
  }

  persistSelectedProfile(profile);
  window.location.href = '/';
}

function showPinModal(profile) {
  lockedProfile = profile;
  pinError.textContent = '';
  pinInput.value = '';
  pinProfileName.textContent = profile.name;
  setAvatarContent(pinAvatar, profile.avatar_icon, profile.avatar_color, `Avatar de ${profile.name}`);
  pinModal.classList.add('open');
  pinModal.setAttribute('aria-hidden', 'false');
  setTimeout(() => pinInput.focus(), 50);
}

function hidePinModal() {
  pinModal.classList.remove('open');
  pinModal.setAttribute('aria-hidden', 'true');
  lockedProfile = null;
  pinInput.value = '';
  pinError.textContent = '';
}

async function verifyProfilePin() {
  if (!lockedProfile) return;

  const pin = pinInput.value.trim();
  pinError.textContent = '';

  if (!/^\d{4}$/.test(pin)) {
    pinError.textContent = 'Digite os 4 dígitos do PIN.';
    pinInput.focus();
    return;
  }

  pinSubmitBtn.disabled = true;
  try {
    const res = await fetch(`/api/profiles/${lockedProfile.id}/verify-pin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ pin }),
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      pinError.textContent = data.error || 'PIN incorreto.';
      pinInput.select();
      return;
    }

    persistSelectedProfile(lockedProfile);
    window.location.href = '/';
  } catch (err) {
    pinError.textContent = 'Erro de conexão ao verificar PIN.';
  } finally {
    pinSubmitBtn.disabled = false;
  }
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
  selectedEmoji = PROFILE_IMAGE_AVATARS[0].url;
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

    // Try to parse JSON response
    let data = null;
    try {
      data = await res.json();
    } catch {
      // JSON parse failed — if status was success, profile was created
      if (res.ok) {
        // Redirect to profiles page to select the newly created profile
        window.location.href = '/profiles.html';
        return;
      }
      createError.textContent = `Erro do servidor (${res.status}). Tente novamente.`;
      return;
    }

    if (!res.ok) {
      createError.textContent = data?.error || 'Erro ao criar perfil.';
      return;
    }

    // Success — save profile and go to the site
    const profile = data.profile;
    if (profile) {
      localStorage.setItem('goatcine_profile', JSON.stringify({
        id:           profile.id,
        name:         profile.name,
        avatar_icon:  profile.avatar_icon,
        avatar_color: profile.avatar_color,
        is_kid:       profile.is_kid,
        has_pin:      profile.has_pin,
      }));
      window.location.href = '/';
    } else {
      // Profile created but response missing data — redirect to select it
      window.location.href = '/profiles.html';
    }

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

pinCancelBtn.addEventListener('click', hidePinModal);
pinSubmitBtn.addEventListener('click', verifyProfilePin);
pinInput.addEventListener('input', () => {
  pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 4);
  pinError.textContent = '';
});
pinInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') verifyProfilePin();
  if (e.key === 'Escape') hidePinModal();
});
pinModal.addEventListener('click', (e) => {
  if (e.target === pinModal) hidePinModal();
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
