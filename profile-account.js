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
let pinMode = 'keep';
let toastTimer = null;
let subscriptionCache = null;

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
const profileMenuTrigger = $('top-profile-trigger');
const profileMenu = $('top-profile-menu');
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
  nameInput.value = activeProfile.name || '';
  selectedAvatar = activeProfile.avatar_icon || PROFILE_IMAGE_AVATARS[0].url;
  selectedColor = activeProfile.avatar_color || '#FFD700';

  topProfileName.textContent = activeProfile.name || 'Perfil';
  setImage(preview, selectedAvatar, `Avatar de ${activeProfile.name || 'perfil'}`);
  setImage(topAvatar, selectedAvatar, `Avatar de ${activeProfile.name || 'perfil'}`);
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
  loadFreshProfile().catch(() => showToast('Nao foi possivel atualizar os dados do perfil.'));

  const initialSection = getSectionFromLocation();
  setActiveSection(initialSection, false);

  toggleAvatarPicker.addEventListener('click', () => {
    avatarGrid.hidden = !avatarGrid.hidden;
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
    btn.addEventListener('click', () => setPinMode(btn.dataset.pinMode));
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

  form.addEventListener('submit', saveProfile);

  $('settings-search-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const query = $('settings-search-input')?.value.trim();
    if (!query) return;
    localStorage.setItem('goatcine_pending_search', query);
    window.location.href = '/';
  });

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
