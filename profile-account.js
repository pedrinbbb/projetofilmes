/* =============================================
   GOATCINE - Settings Page
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
let currentUser = JSON.parse(localStorage.getItem('goatcine_user') || 'null');
let selectedAvatar = activeProfile?.avatar_icon || PROFILE_IMAGE_AVATARS[0].url;
let selectedColor = activeProfile?.avatar_color || '#FFD700';
let selectedFrame = 'default';
let profileBio = '';
let pinMode = 'keep';
let toastTimer = null;
let subscriptionCache = null;
let accountCatalog = [];

const SETTINGS_ROUTES = {
  conta: '/conta',
  assinatura: '/assinatura',
  cobranca: '/cobranca',
  dispositivos: '/dispositivos'
};

const SECTION_BY_PATH = {
  '/account-profile.html': 'conta',
  '/conta': 'conta',
  '/assinatura': 'assinatura',
  '/cobranca': 'cobranca',
  '/dispositivos': 'dispositivos'
};

const $ = (id) => document.getElementById(id);
const form = $('profile-form');
const preview = $('profile-preview');
const topAvatar = $('top-avatar');
const topProfileName = $('top-profile-name');
const accountPillAvatar = $('account-pill-avatar');
const accountPillName = $('account-pill-name');
const profileMenuTrigger = $('top-profile-trigger');
const profileMenu = $('top-profile-menu');
const avatarGrid = $('avatar-grid');
const toggleAvatarPicker = $('toggle-avatar-picker');
const uploadAvatarBtn = $('upload-avatar-btn');
const avatarUploadInput = $('avatar-upload-input');
const avatarFrame = $('avatar-frame');
const nameInput = $('profile-name');
const bioInput = $('profile-bio');
const pinStatus = $('pin-status');
const pinInputRow = $('pin-input-row');
const pinInput = $('profile-pin');
const removePinTab = $('remove-pin-tab');
const pinBoxes = Array.from(document.querySelectorAll('.pin-box'));
const saveBtn = form.querySelector('.save-btn');
const saveState = $('save-state');
const toast = $('toast');

function getProfileMetaKey() {
  return `goatcine_profile_meta_${activeProfile?.id || 'default'}`;
}

function readProfileMeta() {
  try {
    const saved = JSON.parse(localStorage.getItem(getProfileMetaKey()) || '{}');
    return saved && typeof saved === 'object' ? saved : {};
  } catch {
    return {};
  }
}

function writeProfileMeta(meta) {
  localStorage.setItem(getProfileMetaKey(), JSON.stringify(meta));
}

function getProfileStorageKey(prefix) {
  return `${prefix}${activeProfile?.id || 'default'}`;
}

function readJsonStorage(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

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

function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

function formatDate(value) {
  if (!value) return 'Nenhuma';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Nenhuma';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
}

function formatDateTime(value) {
  if (!value) return 'Sem registro';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem registro';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function renderProfile() {
  const meta = readProfileMeta();
  nameInput.value = activeProfile.name || '';
  if (bioInput) bioInput.value = meta.bio || '';
  selectedAvatar = activeProfile.avatar_icon || PROFILE_IMAGE_AVATARS[0].url;
  selectedColor = activeProfile.avatar_color || '#FFD700';
  selectedFrame = meta.frame || 'default';
  profileBio = meta.bio || '';

  if (topProfileName) topProfileName.textContent = activeProfile.name || 'Perfil';
  if (accountPillName) accountPillName.textContent = activeProfile.name || 'Perfil';
  setImage(preview, selectedAvatar, `Avatar de ${activeProfile.name || 'perfil'}`);
  setImage(topAvatar, selectedAvatar, `Avatar de ${activeProfile.name || 'perfil'}`);
  if (accountPillAvatar) setImage(accountPillAvatar, selectedAvatar, `Avatar de ${activeProfile.name || 'perfil'}`);
  [preview, topAvatar, accountPillAvatar].filter(Boolean).forEach((element) => {
    element.dataset.frame = selectedFrame;
    element.style.setProperty('--profile-accent', selectedColor);
  });
  if (avatarFrame) avatarFrame.value = selectedFrame;
  document.querySelectorAll('.accent-swatch').forEach((swatch) => {
    swatch.classList.toggle('active', swatch.dataset.color === selectedColor);
  });
  pinStatus.textContent = activeProfile.has_pin ? 'PIN definido' : 'Nenhum PIN definido';
  if (removePinTab) removePinTab.hidden = !activeProfile.has_pin;
  if (!activeProfile.has_pin && pinMode === 'remove') setPinMode('keep');
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

function compressAvatarFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Arquivo invalido.'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Nao foi possivel ler a imagem.'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('Nao foi possivel carregar a imagem.'));
      image.onload = () => {
        const size = Math.min(image.width, image.height);
        const sourceX = Math.floor((image.width - size) / 2);
        const sourceY = Math.floor((image.height - size) / 2);
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, sourceX, sourceY, size, size, 0, 0, 512, 512);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function uploadSelectedAvatarIfNeeded() {
  if (!selectedAvatar.startsWith('data:image/')) return selectedAvatar;

  const res = await fetch(`/api/profiles/${activeProfile.id}/avatar`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ imageData: selectedAvatar })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Nao foi possivel enviar o avatar.');

  activeProfile = data.profile;
  localStorage.setItem('goatcine_profile', JSON.stringify(activeProfile));
  selectedAvatar = data.avatarUrl || activeProfile.avatar_icon;
  return selectedAvatar;
}

function clearPinBoxes() {
  pinInput.value = '';
  pinBoxes.forEach((box) => {
    box.value = '';
  });
}

function syncPinFromBoxes() {
  pinInput.value = pinBoxes.map((box) => box.value).join('').replace(/\D/g, '').slice(0, 4);
}

function setPinMode(mode) {
  pinMode = mode;
  document.querySelectorAll('.pin-tab').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.pinMode === mode);
  });

  clearPinBoxes();
  pinInputRow.hidden = mode !== 'set';

  if (mode === 'keep') {
    pinStatus.textContent = activeProfile.has_pin ? 'PIN definido' : 'Nenhum PIN definido';
  } else if (mode === 'set') {
    pinStatus.textContent = 'Novo PIN sera solicitado ao entrar neste perfil';
    pinBoxes[0]?.focus();
  } else {
    pinStatus.textContent = 'O PIN sera removido ao salvar';
  }
}

function getSectionFromLocation() {
  const pathname = window.location.pathname.replace(/\/$/, '') || '/';
  const hashSection = (window.location.hash || '').replace('#', '');

  if (SECTION_BY_PATH[pathname]) return SECTION_BY_PATH[pathname];
  if (['conta', 'assinatura', 'cobranca', 'dispositivos'].includes(hashSection)) return hashSection;
  return 'conta';
}

function setActiveSection(sectionName, updateHash = true) {
  const safeSection = ['conta', 'assinatura', 'cobranca', 'dispositivos'].includes(sectionName)
    ? sectionName
    : 'conta';

  document.querySelectorAll('.settings-nav-item').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.section === safeSection);
  });

  document.querySelectorAll('.settings-view').forEach((view) => {
    view.classList.toggle('active', view.id === `view-${safeSection}`);
  });

  if (updateHash) {
    history.pushState({ section: safeSection }, '', SETTINGS_ROUTES[safeSection]);
  }

  if (safeSection === 'assinatura') loadSubscription();
  if (safeSection === 'cobranca') loadBilling();
  if (safeSection === 'dispositivos') loadDevices();
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
    pinBoxes.find((box) => !box.value)?.focus();
    return;
  }

  saveBtn.disabled = true;
  saveState.innerHTML = '<i class="fa-solid fa-circle"></i> Salvando';

  try {
    const avatarUrl = await uploadSelectedAvatarIfNeeded();
    const payload = {
      name,
      avatar_icon: avatarUrl,
      avatar_color: selectedColor
    };

    if (pinMode === 'set') payload.pin = pinInput.value.trim();
    if (pinMode === 'remove') payload.pin = '';

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
    selectedAvatar = avatarUrl || activeProfile.avatar_icon;
    selectedColor = activeProfile.avatar_color;
    writeProfileMeta({
      bio: bioInput?.value.trim() || '',
      frame: avatarFrame?.value || 'default',
      accent: selectedColor
    });
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

function currentPlanFromSubscription(subscription, plans) {
  if (!subscription?.sub_active) return null;
  if (!subscription.sub_plan_id) {
    return {
      name: 'Teste gratuito',
      price: 0,
      screens: 1
    };
  }
  return plans.find(plan => Number(plan.id) === Number(subscription.sub_plan_id)) || null;
}

async function loadSubscription() {
  try {
    const res = await fetch('/api/user/subscription', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Erro ao carregar assinatura');
    const data = await res.json();
    subscriptionCache = data;

    const subscription = data.subscription || {};
    const plans = data.plans || [];
    const currentPlan = currentPlanFromSubscription(subscription, plans);
    const isActive = Number(subscription.sub_active) === 1;

    $('subscription-status').textContent = isActive ? 'Ativo' : 'Inativo';
    $('current-plan-name').textContent = currentPlan ? currentPlan.name : 'Nenhum plano ativo';
    $('current-plan-price').textContent = currentPlan ? formatCurrency(currentPlan.price) : 'R$ 0,00';
    $('current-plan-screens').textContent = currentPlan ? currentPlan.screens : 0;
    $('current-plan-devices').textContent = currentPlan ? currentPlan.screens : 0;
    $('current-plan-expiry').textContent = isActive
      ? `Encerra em: ${formatDate(subscription.sub_expires_at)}`
      : 'Nenhuma assinatura ativa';

    renderPlans(plans);
    $('next-billing-date').textContent = isActive ? formatDate(subscription.sub_expires_at) : 'Nenhuma';
  } catch (err) {
    showToast('Nao foi possivel carregar sua assinatura.');
  }
}

function renderPlans(plans) {
  const grid = $('settings-plans-grid');
  grid.innerHTML = '';

  plans.forEach((plan) => {
    const card = document.createElement('div');
    card.className = 'plan-card';
    card.innerHTML = `
      <span>Plano ${plan.screens} ${plan.screens === 1 ? 'tela' : 'telas'}</span>
      <strong>${formatCurrency(plan.price)} <small>/mês</small></strong>
      <p>${plan.screens} ${plan.screens === 1 ? 'tela' : 'telas'} · ${plan.screens} ${plan.screens === 1 ? 'dispositivo' : 'dispositivos'}</p>
      <button class="ghost-btn" type="button"><i class="fa-regular fa-credit-card"></i> Pagar com PIX</button>
    `;
    card.querySelector('button').addEventListener('click', () => startPixCheckout(plan.id));
    grid.appendChild(card);
  });
}

async function startPixCheckout(planId) {
  const checkout = $('settings-checkout');
  const pixCode = $('settings-pix-code');
  checkout.hidden = false;
  pixCode.value = 'Gerando cobrança PIX...';

  try {
    const res = await fetch('/api/user/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ planId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao gerar PIX.');
    pixCode.value = data.qrcodeText || '';
    showToast('PIX gerado. Copie o código para pagar.');
    loadBilling();
  } catch (err) {
    pixCode.value = '';
    showToast(err.message || 'Nao foi possivel gerar o PIX.');
  }
}

async function loadBilling() {
  if (!subscriptionCache) {
    await loadSubscription();
  }

  try {
    const res = await fetch('/api/user/billing', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Erro ao carregar cobranca');
    const data = await res.json();
    const logs = data.logs || [];
    const list = $('billing-list');
    list.innerHTML = '';
    $('billing-count').textContent = logs.length;

    if (!logs.length) {
      list.innerHTML = `
        <div class="empty-box">
          <div>
            <i class="fa-regular fa-rectangle-list" style="font-size: 2rem; margin-bottom: 14px;"></i>
            <strong>Nenhum pagamento ainda.</strong>
            <p>Quando você fizer um pagamento via PIX, ele aparecerá aqui.</p>
          </div>
        </div>
      `;
      return;
    }

    logs.forEach((log) => {
      const row = document.createElement('div');
      row.className = 'billing-row';
      row.innerHTML = `
        <div>
          <strong>${log.plan_name || 'GOATCINE'}</strong>
          <span>${formatCurrency(log.amount)} · ${formatDateTime(log.paid_at || log.created_at)}</span>
        </div>
        <span class="billing-status">${log.status || 'pending'}</span>
      `;
      list.appendChild(row);
    });
  } catch (err) {
    showToast('Nao foi possivel carregar o historico.');
  }
}

async function loadDevices() {
  try {
    const res = await fetch('/api/user/devices', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error('Erro ao carregar dispositivos');
    const data = await res.json();
    const devices = data.devices || [];
    const list = $('devices-list');
    list.innerHTML = '';
    $('devices-count').textContent = `${devices.length} ${devices.length === 1 ? 'device' : 'devices'}`;

    if (!devices.length) {
      list.innerHTML = '<div class="empty-box">Nenhum dispositivo conectado.</div>';
      return;
    }

    devices.forEach((device) => {
      const row = document.createElement('div');
      row.className = 'device-row';
      row.innerHTML = `
        <div class="device-main">
          <div class="device-icon"><i class="fa-solid fa-desktop"></i></div>
          <div>
            <strong>${device.name}${device.current ? ' · Este dispositivo' : ''}</strong>
            <span>${activeProfile.name || 'Perfil ativo'}</span>
            <div class="device-meta">
              <span><small>Conectado em</small>${formatDateTime(device.created_at)}</span>
              <span><small>Expira em</small>${formatDateTime(device.expires_at)}</span>
            </div>
          </div>
        </div>
        <button class="device-action" type="button"><i class="fa-solid fa-arrow-right-from-bracket"></i> Desconectar</button>
      `;
      row.querySelector('button').addEventListener('click', () => disconnectDevice(device.id, device.current));
      list.appendChild(row);
    });
  } catch (err) {
    showToast('Nao foi possivel carregar dispositivos.');
  }
}

async function disconnectDevice(deviceId, isCurrent) {
  try {
    const res = await fetch(`/api/user/devices/${deviceId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erro ao desconectar.');

    if (isCurrent || data.disconnectedCurrent) {
      await logout(false);
      return;
    }

    showToast('Dispositivo desconectado.');
    loadDevices();
  } catch (err) {
    showToast(err.message || 'Nao foi possivel desconectar.');
  }
}

function formatHours(seconds) {
  const hours = Math.max(0, Number(seconds) || 0) / 3600;
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  return `${Math.round(hours)}h`;
}

function getProfileMyList() {
  return readJsonStorage(getProfileStorageKey('goatcine_my_list_'), []).map(String);
}

function getProfileProgress() {
  return Object.values(readJsonStorage(getProfileStorageKey('goatcine_watch_progress_'), {}));
}

function getProfileHistory() {
  return readJsonStorage(getProfileStorageKey('goatcine_watch_history_'), []);
}

function getProfileWatchedEpisodes() {
  return readJsonStorage(getProfileStorageKey('goatcine_watched_episodes_'), []);
}

function primaryGenre(value) {
  return String(value || '').split('/')[0].trim();
}

function detectDeviceLabel() {
  const ua = navigator.userAgent || '';
  if (/Mobi|Android|iPhone/i.test(ua)) return 'Mobile';
  if (/Tablet|iPad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

function createMiniCard(item) {
  const card = document.createElement('article');
  card.className = 'mini-title-card';
  card.innerHTML = `
    <img src="${item.poster || item.backdrop || ''}" alt="${item.title || item.playbackTitle || 'Titulo'}" loading="lazy" />
    <div>
      <strong>${item.title || item.playbackTitle || 'Titulo'}</strong>
      <span>${[item.year, item.genre || item.subtitle].filter(Boolean).join(' · ')}</span>
    </div>
  `;
  return card;
}

function renderMiniRail(id, items, emptyText) {
  const rail = $(id);
  if (!rail) return;
  rail.innerHTML = '';
  const limited = (items || []).filter(Boolean).slice(0, 12);
  if (!limited.length) {
    rail.innerHTML = `<div class="empty-box compact-empty">${emptyText}</div>`;
    return;
  }
  limited.forEach(item => rail.appendChild(createMiniCard(item)));
}

async function loadAccountDashboard() {
  try {
    const res = await fetch('/api/movies');
    if (res.ok) {
      const data = await res.json();
      accountCatalog = data.movies || [];
    }
  } catch {}

  const catalogById = new Map(accountCatalog.map(item => [String(item.id), item]));
  const progress = getProfileProgress();
  const history = getProfileHistory();
  const watchedEpisodes = getProfileWatchedEpisodes();
  const myListIds = getProfileMyList();
  const myListItems = myListIds.map(id => catalogById.get(String(id))).filter(Boolean);
  const completed = history.filter(item => item.completed);
  const totalSeconds = [...progress, ...history].reduce((sum, item) => sum + (Number(item.currentTime) || 0), 0);
  const genreCounts = new Map();

  history.concat(myListItems).forEach((item) => {
    const genre = primaryGenre(item.genre);
    if (genre) genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
  });

  const favoriteGenre = Array.from(genreCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  const movieCount = completed.filter(item => item.type !== 'series' && item.type !== 'episode').length;
  const seriesCount = new Set(completed.filter(item => item.type === 'series' || item.type === 'episode').map(item => item.id)).size || watchedEpisodes.length;

  $('stat-movies-watched').textContent = movieCount;
  $('stat-series-watched').textContent = seriesCount;
  $('stat-hours-watched').textContent = formatHours(totalSeconds);
  $('stat-favorite-genre').textContent = favoriteGenre;
  $('stat-last-access').textContent = formatDateTime(Date.now());
  $('stat-device').textContent = detectDeviceLabel();

  renderMiniRail('account-continue-rail', progress.map(item => ({
    ...item,
    title: item.title || item.playbackTitle,
    poster: item.poster || item.backdrop
  })), 'Nada em andamento ainda.');
  renderMiniRail('account-my-list-rail', myListItems, 'Sua lista ainda está vazia.');
  renderMiniRail('account-favorites-rail', (myListItems.length ? myListItems : accountCatalog).sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)), 'Sem favoritos ainda.');
  renderMiniRail('account-watched-rail', completed, 'Nenhum título concluído ainda.');

  const historyList = $('account-history-list');
  if (historyList) {
    historyList.innerHTML = '';
    if (!history.length) {
      historyList.innerHTML = '<div class="empty-box compact-empty">Seu histórico aparecerá aqui.</div>';
    } else {
      history.slice(0, 10).forEach((item) => {
        const row = document.createElement('div');
        row.className = 'history-row';
        row.innerHTML = `
          <div>
            <strong>${item.playbackTitle || item.title}</strong>
            <span>${formatDateTime(item.watchedAt)} · ${item.completed ? 'Concluído' : 'Em andamento'}</span>
          </div>
          <small>${item.genre || item.type || 'GOATCINE'}</small>
        `;
        historyList.appendChild(row);
      });
    }
  }
}

async function deleteAccount() {
  const confirmed = window.confirm('Excluir sua conta permanentemente? Essa ação não pode ser desfeita.');
  if (!confirmed) return;

  try {
    const res = await fetch('/api/user/account', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Nao foi possivel excluir a conta.');
    localStorage.clear();
    window.location.href = '/login.html';
  } catch (err) {
    showToast(err.message || 'Nao foi possivel excluir a conta.');
  }
}

async function logout(callServer = true) {
  try {
    if (callServer) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    }
  } catch {}

  localStorage.removeItem('goatcine_token');
  localStorage.removeItem('goatcine_user');
  localStorage.removeItem('goatcine_profile');
  window.location.href = '/login.html';
}

if (guardSession()) {
  buildAvatarGrid();
  renderProfile();
  loadAccountDashboard();
  loadFreshProfile().catch(() => showToast('Nao foi possivel atualizar os dados do perfil.'));

  const initialSection = getSectionFromLocation();
  setActiveSection(initialSection, false);

  toggleAvatarPicker.addEventListener('click', () => {
    avatarGrid.hidden = !avatarGrid.hidden;
  });

  uploadAvatarBtn?.addEventListener('click', () => {
    avatarUploadInput?.click();
  });

  avatarUploadInput?.addEventListener('change', async () => {
    const file = avatarUploadInput.files?.[0];
    if (!file) return;
    try {
      selectedAvatar = await compressAvatarFile(file);
      setImage(preview, selectedAvatar, 'Preview do avatar enviado');
      updateAvatarSelection();
      showToast('Preview pronto. Salve para aplicar o avatar.');
    } catch (err) {
      showToast(err.message || 'Nao foi possivel preparar a imagem.');
    } finally {
      avatarUploadInput.value = '';
    }
  });

  avatarFrame?.addEventListener('change', () => {
    selectedFrame = avatarFrame.value || 'default';
    [preview, topAvatar, accountPillAvatar].filter(Boolean).forEach((element) => {
      element.dataset.frame = selectedFrame;
    });
  });

  document.querySelectorAll('.accent-swatch').forEach((swatch) => {
    swatch.addEventListener('click', () => {
      selectedColor = swatch.dataset.color || '#FFD700';
      document.querySelectorAll('.accent-swatch').forEach(item => item.classList.remove('active'));
      swatch.classList.add('active');
      [preview, topAvatar, accountPillAvatar].filter(Boolean).forEach((element) => {
        element.style.setProperty('--profile-accent', selectedColor);
      });
    });
  });

  document.querySelectorAll('.settings-nav-item').forEach((btn) => {
    btn.addEventListener('click', () => setActiveSection(btn.dataset.section));
  });

  document.querySelectorAll('[data-section-jump]').forEach((btn) => {
    btn.addEventListener('click', () => setActiveSection(btn.dataset.sectionJump));
  });

  window.addEventListener('popstate', () => {
    setActiveSection(getSectionFromLocation(), false);
  });

  document.querySelectorAll('.pin-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.pinMode === 'remove' && !activeProfile.has_pin) return;
      setPinMode(btn.dataset.pinMode);
    });
  });

  document.querySelectorAll('[data-menu-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      profileMenu.classList.remove('open');
      profileMenu.setAttribute('aria-hidden', 'true');
      profileMenuTrigger.setAttribute('aria-expanded', 'false');
      setActiveSection(btn.dataset.menuTarget);
    });
  });

  pinInput.addEventListener('input', () => {
    pinInput.value = pinInput.value.replace(/\D/g, '').slice(0, 4);
  });

  pinBoxes.forEach((box, index) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '').slice(0, 1);
      syncPinFromBoxes();
      if (box.value && index < pinBoxes.length - 1) {
        pinBoxes[index + 1].focus();
      }
    });

    box.addEventListener('keydown', (event) => {
      if (event.key === 'Backspace' && !box.value && index > 0) {
        pinBoxes[index - 1].focus();
      }
    });

    box.addEventListener('paste', (event) => {
      event.preventDefault();
      const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
      pinBoxes.forEach((target, targetIndex) => {
        target.value = pasted[targetIndex] || '';
      });
      syncPinFromBoxes();
      pinBoxes[Math.min(pasted.length, pinBoxes.length - 1)]?.focus();
    });
  });

  form.addEventListener('submit', saveProfile);

  $('action-edit-profile')?.addEventListener('click', () => {
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    nameInput.focus();
  });

  $('action-change-password')?.addEventListener('click', () => {
    if (currentUser?.email) localStorage.setItem('goatcine_reset_email', currentUser.email);
    window.location.href = '/login.html';
  });

  $('action-active-sessions')?.addEventListener('click', () => setActiveSection('dispositivos'));
  $('action-manage-devices')?.addEventListener('click', () => setActiveSection('dispositivos'));
  $('action-delete-account')?.addEventListener('click', deleteAccount);

  profileMenuTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    const open = !profileMenu.classList.contains('open');
    profileMenu.classList.toggle('open', open);
    profileMenu.setAttribute('aria-hidden', String(!open));
    profileMenuTrigger.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    if (!profileMenu.contains(event.target) && event.target !== profileMenuTrigger) {
      profileMenu.classList.remove('open');
      profileMenu.setAttribute('aria-hidden', 'true');
      profileMenuTrigger.setAttribute('aria-expanded', 'false');
    }
  });

  $('copy-pix-btn').addEventListener('click', async () => {
    const value = $('settings-pix-code').value;
    if (!value) return;
    await navigator.clipboard.writeText(value);
    showToast('Código PIX copiado.');
  });

  $('menu-logout-btn').addEventListener('click', () => logout(true));
}
