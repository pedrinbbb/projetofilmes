/* =============================================
   GOATCINE - Profile Account Page
   ============================================= */

const PROFILE_IMAGE_AVATARS = [
  { url: 'https://i.postimg.cc/HLpy2Qpv/image.png', label: 'Avatar real 1' },
  { url: 'https://i.postimg.cc/G2ts0dTH/image.png', label: 'Avatar real 2' },
  { url: 'https://i.postimg.cc/hv7zjsrf/image.png', label: 'Avatar real 3' },
  { url: 'https://i.postimg.cc/3W5yDGSb/image.png', label: 'Avatar real 4' },
  { url: 'https://i.postimg.cc/tRLDzm8D/image.png', label: 'Avatar real 5' },
  { url: 'https://i.postimg.cc/T3x9z5dp/image.png', label: 'Avatar real 6' },
  { url: 'https://i.postimg.cc/T3QrBkHG/image.png', label: 'Avatar real 7' }
];

const token = localStorage.getItem('goatcine_token');
let activeProfile = JSON.parse(localStorage.getItem('goatcine_profile') || 'null');
let selectedAvatar = activeProfile?.avatar_icon || PROFILE_IMAGE_AVATARS[0].url;
let selectedColor = activeProfile?.avatar_color || '#FFD700';
let pinMode = 'keep';
let toastTimer = null;

const $ = (id) => document.getElementById(id);
const form = $('profile-form');
const preview = $('profile-preview');
const pillAvatar = $('pill-avatar');
const pillName = $('pill-name');
const avatarGrid = $('avatar-grid');
const toggleAvatarPicker = $('toggle-avatar-picker');
const nameInput = $('profile-name');
const pinStatus = $('pin-status');
const pinInputRow = $('pin-input-row');
const pinInput = $('profile-pin');
const saveBtn = form.querySelector('.save-btn');
const saveState = $('save-state');
const toast = $('toast');

function guardSession() {
  if (!token) {
    window.location.replace('/login.html');
    return false;
  }

  if (!activeProfile?.id) {
    window.location.replace('/profiles.html');
    return false;
  }

  return true;
}

function showToast(message) {
  clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => toast.classList.remove('show'), 2800);
}

function setImage(element, src, alt) {
  element.innerHTML = '';
  const img = document.createElement('img');
  img.src = src;
  img.alt = alt;
  img.referrerPolicy = 'no-referrer';
  img.onerror = () => {
    element.textContent = 'G';
  };
  element.appendChild(img);
}

function renderProfile() {
  nameInput.value = activeProfile.name || '';
  selectedAvatar = activeProfile.avatar_icon || PROFILE_IMAGE_AVATARS[0].url;
  selectedColor = activeProfile.avatar_color || '#FFD700';

  pillName.textContent = activeProfile.name || 'Perfil';
  setImage(preview, selectedAvatar, `Avatar de ${activeProfile.name || 'perfil'}`);
  setImage(pillAvatar, selectedAvatar, `Avatar de ${activeProfile.name || 'perfil'}`);
  pinStatus.textContent = activeProfile.has_pin ? 'PIN definido' : 'Nenhum PIN definido';
  updateAvatarSelection();
}

function buildAvatarGrid() {
  avatarGrid.innerHTML = '';
  PROFILE_IMAGE_AVATARS.forEach((avatar) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'avatar-choice';
    btn.title = avatar.label;
    btn.setAttribute('aria-label', avatar.label);
    setImage(btn, avatar.url, avatar.label);
    btn.addEventListener('click', () => {
      selectedAvatar = avatar.url;
      setImage(preview, selectedAvatar, 'Avatar selecionado');
      updateAvatarSelection();
      avatarGrid.hidden = true;
    });
    avatarGrid.appendChild(btn);
  });
}

function updateAvatarSelection() {
  avatarGrid.querySelectorAll('.avatar-choice').forEach((btn, index) => {
    btn.classList.toggle('active', PROFILE_IMAGE_AVATARS[index].url === selectedAvatar);
  });
}

function setPinMode(mode) {
  pinMode = mode;
  document.querySelectorAll('.pin-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.pinMode === mode);
  });

  pinInput.value = '';
  pinInputRow.hidden = mode !== 'set';

  if (mode === 'keep') {
    pinStatus.textContent = activeProfile.has_pin ? 'PIN definido' : 'Nenhum PIN definido';
  } else if (mode === 'set') {
    pinStatus.textContent = 'Novo PIN sera solicitado ao entrar neste perfil';
    pinInput.focus();
  } else {
    pinStatus.textContent = 'O PIN sera removido ao salvar';
  }
}

async function loadFreshProfile() {
  const res = await fetch('/api/profiles', {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.status === 401) {
    localStorage.removeItem('goatcine_token');
    localStorage.removeItem('goatcine_profile');
    window.location.replace('/login.html');
    return;
  }

  if (!res.ok) throw new Error('Erro ao carregar perfil');

  const data = await res.json();
  const fresh = (data.profiles || []).find(profile => Number(profile.id) === Number(activeProfile.id));
  if (!fresh) {
    localStorage.removeItem('goatcine_profile');
    window.location.replace('/profiles.html');
    return;
  }

  activeProfile = fresh;
  localStorage.setItem('goatcine_profile', JSON.stringify(fresh));
  renderProfile();
}

async function saveProfile(event) {
  event.preventDefault();

  const name = nameInput.value.trim();
  if (!name) {
    showToast('Digite um nome para o perfil.');
    nameInput.focus();
    return;
  }

  if (pinMode === 'set' && !/^\d{4}$/.test(pinInput.value.trim())) {
    showToast('O PIN precisa ter exatamente 4 digitos.');
    pinInput.focus();
    return;
  }

  const payload = {
    name,
    avatar_icon: selectedAvatar,
    avatar_color: selectedColor
  };

  if (pinMode === 'set') payload.pin = pinInput.value.trim();
  if (pinMode === 'remove') payload.pin = '';

  saveBtn.disabled = true;
  saveState.innerHTML = '<i class="fa-solid fa-circle"></i> Salvando';

  try {
    const res = await fetch(`/api/profiles/${activeProfile.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (!res.ok) {
      showToast(data.error || 'Nao foi possivel salvar o perfil.');
      return;
    }

    activeProfile = data.profile;
    localStorage.setItem('goatcine_profile', JSON.stringify(activeProfile));
    selectedAvatar = activeProfile.avatar_icon;
    selectedColor = activeProfile.avatar_color;
    setPinMode('keep');
    renderProfile();
    showToast('Perfil atualizado com sucesso.');
    saveState.innerHTML = '<i class="fa-solid fa-circle"></i> Alteracoes salvas';
  } catch (err) {
    showToast('Erro de conexao ao salvar.');
  } finally {
    saveBtn.disabled = false;
  }
}

if (guardSession()) {
  buildAvatarGrid();
  renderProfile();
  loadFreshProfile().catch(() => showToast('Nao foi possivel atualizar os dados do perfil.'));

  toggleAvatarPicker.addEventListener('click', () => {
    avatarGrid.hidden = !avatarGrid.hidden;
  });

  document.querySelectorAll('.pin-tab').forEach((btn) => {
    btn.addEventListener('click', () => setPinMode(btn.dataset.pinMode));
  });

  pinInput.addEventListener('input', () => {
    pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 4);
  });

  form.addEventListener('submit', saveProfile);
}
