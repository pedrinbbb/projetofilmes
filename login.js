/* =============================================
   GOATCINE — Login Page Logic
   ============================================= */

// ---- AUTH STATE ----
const AUTH_KEY = 'goatcine_user';

function getUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY));
  } catch {
    return null;
  }
}

function setUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

// If already logged in, redirect to main site
if (getUser()) {
  window.location.href = 'index.html';
}

// ---- PARTICLES ----
function createParticles() {
  const container = document.getElementById('bg-particles');
  for (let i = 0; i < 18; i++) {
    const dot = document.createElement('div');
    dot.className = 'p-dot';
    const size = Math.random() * 2.5 + 1;
    dot.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${Math.random() * 100}%;
      animation-duration: ${Math.random() * 14 + 8}s;
      animation-delay: ${Math.random() * 12}s;
      --dx: ${(Math.random() - 0.5) * 100}px;
    `;
    container.appendChild(dot);
  }
}

// ---- TAB SWITCHING ----
const tabSlider = document.getElementById('tab-slider');
const formLogin = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

function switchTab(tab) {
  const isLogin = tab === 'login';

  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);

  document.getElementById('tab-login').setAttribute('aria-selected', String(isLogin));
  document.getElementById('tab-register').setAttribute('aria-selected', String(!isLogin));

  tabSlider.classList.toggle('right', !isLogin);

  // Animate form switch
  const outForm = isLogin ? formRegister : formLogin;
  const inForm = isLogin ? formLogin : formRegister;

  outForm.classList.add('hidden');
  inForm.classList.remove('hidden');

  // Re-trigger animation
  inForm.style.animation = 'none';
  inForm.offsetHeight; // reflow
  inForm.style.animation = '';
}

document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
document.getElementById('tab-register').addEventListener('click', () => switchTab('register'));
document.getElementById('go-register').addEventListener('click', () => switchTab('register'));
document.getElementById('go-login').addEventListener('click', () => switchTab('login'));

// ---- TOGGLE PASSWORD VISIBILITY ----
function initPasswordToggle(toggleId, inputId) {
  const btn = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';

    // Update icon
    btn.querySelector('.eye-icon').innerHTML = isPass
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });
}

initPasswordToggle('login-toggle-pass', 'login-password');
initPasswordToggle('register-toggle-pass', 'register-password');
initPasswordToggle('register-toggle-confirm', 'register-confirm');

// ---- PASSWORD STRENGTH ----
const registerPassword = document.getElementById('register-password');
const strengthBar = document.getElementById('strength-bar');
const strengthLabel = document.getElementById('strength-label');

const strengthLevels = [
  { max: 1, label: 'Muito fraca', color: '#FF4444', width: '15%' },
  { max: 2, label: 'Fraca', color: '#FF8800', width: '35%' },
  { max: 3, label: 'Razoável', color: '#FFD700', width: '60%' },
  { max: 4, label: 'Forte', color: '#88DD00', width: '80%' },
  { max: 5, label: 'Muito forte 💪', color: '#4ADE80', width: '100%' },
];

function checkStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return Math.max(0, Math.min(score, 5));
}

if (registerPassword) {
  registerPassword.addEventListener('input', () => {
    const pw = registerPassword.value;
    if (!pw) {
      strengthBar.style.width = '0%';
      strengthLabel.textContent = '';
      strengthLabel.style.color = '';
      return;
    }
    const score = checkStrength(pw);
    const level = strengthLevels[score - 1] || strengthLevels[0];
    strengthBar.style.width = level.width;
    strengthBar.style.backgroundColor = level.color;
    strengthLabel.textContent = `Senha: ${level.label}`;
    strengthLabel.style.color = level.color;
  });
}

// ---- VALIDATION HELPERS ----
function showError(groupId, errorId, message) {
  const group = document.getElementById(groupId);
  const error = document.getElementById(errorId);
  if (group) group.classList.add('error');
  if (group) group.classList.remove('success');
  if (error) error.textContent = '⚠ ' + message;
}

function clearError(groupId, errorId) {
  const group = document.getElementById(groupId);
  const error = document.getElementById(errorId);
  if (group) group.classList.remove('error');
  if (error) error.textContent = '';
}

function markSuccess(groupId) {
  const group = document.getElementById(groupId);
  if (group) {
    group.classList.remove('error');
    group.classList.add('success');
  }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// Real-time validation
document.getElementById('login-email').addEventListener('input', function() {
  if (this.value && !isValidEmail(this.value)) {
    showError('login-email-group', 'login-email-error', 'Email inválido');
  } else {
    clearError('login-email-group', 'login-email-error');
    if (this.value) markSuccess('login-email-group');
  }
});

document.getElementById('register-email').addEventListener('input', function() {
  if (this.value && !isValidEmail(this.value)) {
    showError('register-email-group', 'register-email-error', 'Email inválido');
  } else {
    clearError('register-email-group', 'register-email-error');
    if (this.value) markSuccess('register-email-group');
  }
});

document.getElementById('register-confirm').addEventListener('input', function() {
  const pw = document.getElementById('register-password').value;
  if (this.value && this.value !== pw) {
    showError('register-confirm-group', 'register-confirm-error', 'As senhas não coincidem');
  } else {
    clearError('register-confirm-group', 'register-confirm-error');
    if (this.value) markSuccess('register-confirm-group');
  }
});

// ---- DISCORD LOGIN ----
function handleDiscordAuth(mode) {
  const btn = document.getElementById(mode === 'login' ? 'login-discord-btn' : 'register-discord-btn');
  btn.disabled = true;
  btn.style.opacity = '0.7';
  btn.innerHTML = `
    <svg class="discord-icon" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.1 18.08.114 18.1.132 18.11a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
    </svg>
    Conectando ao Discord...
  `;

  // Simulate Discord OAuth (in production, redirect to Discord OAuth URL)
  setTimeout(() => {
    const discordUser = {
      name: 'Usuário Discord',
      email: 'discord@goatcine.com',
      avatar: '🎮',
      method: 'discord',
      joinedAt: new Date().toISOString()
    };
    loginSuccess(discordUser);
  }, 1800);
}

document.getElementById('login-discord-btn').addEventListener('click', () => handleDiscordAuth('login'));
document.getElementById('register-discord-btn').addEventListener('click', () => handleDiscordAuth('register'));

// ---- FORGOT PASSWORD ----
document.getElementById('forgot-btn').addEventListener('click', () => {
  const email = document.getElementById('login-email').value;
  if (!email || !isValidEmail(email)) {
    showError('login-email-group', 'login-email-error', 'Digite seu email primeiro');
    document.getElementById('login-email').focus();
    return;
  }
  // Simulate email sent
  const btn = document.getElementById('forgot-btn');
  btn.textContent = '✓ Email enviado!';
  btn.style.color = '#4ADE80';
  btn.disabled = true;
  setTimeout(() => {
    btn.textContent = 'Esqueceu a senha?';
    btn.style.color = '';
    btn.disabled = false;
  }, 4000);
});

// ---- LOGIN FORM SUBMIT ----
document.getElementById('login-email-form').addEventListener('submit', function(e) {
  e.preventDefault();
  let valid = true;

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  clearError('login-email-group', 'login-email-error');
  clearError('login-password-group', 'login-password-error');

  if (!email) {
    showError('login-email-group', 'login-email-error', 'O email é obrigatório');
    valid = false;
  } else if (!isValidEmail(email)) {
    showError('login-email-group', 'login-email-error', 'Digite um email válido');
    valid = false;
  } else {
    markSuccess('login-email-group');
  }

  if (!password) {
    showError('login-password-group', 'login-password-error', 'A senha é obrigatória');
    valid = false;
  } else if (password.length < 6) {
    showError('login-password-group', 'login-password-error', 'Senha muito curta');
    valid = false;
  } else {
    markSuccess('login-password-group');
  }

  if (!valid) return;

  // Simulate login
  const submitBtn = document.getElementById('login-submit-btn');
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  setTimeout(() => {
    const user = {
      name: email.split('@')[0],
      email: email,
      avatar: email[0].toUpperCase(),
      method: 'email',
      joinedAt: new Date().toISOString()
    };
    loginSuccess(user);
  }, 1600);
});

// ---- REGISTER FORM SUBMIT ----
document.getElementById('register-email-form').addEventListener('submit', function(e) {
  e.preventDefault();
  let valid = true;

  const name = document.getElementById('register-name').value.trim();
  const email = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm = document.getElementById('register-confirm').value;
  const terms = document.getElementById('terms-check').checked;

  // Clear all errors
  ['register-name-group', 'register-email-group', 'register-password-group', 'register-confirm-group'].forEach(id => {
    const group = document.getElementById(id);
    if (group) { group.classList.remove('error', 'success'); }
  });
  ['register-name-error', 'register-email-error', 'register-password-error', 'register-confirm-error', 'terms-error'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });

  if (!name || name.length < 2) {
    showError('register-name-group', 'register-name-error', 'Digite seu nome completo');
    valid = false;
  } else {
    markSuccess('register-name-group');
  }

  if (!email) {
    showError('register-email-group', 'register-email-error', 'O email é obrigatório');
    valid = false;
  } else if (!isValidEmail(email)) {
    showError('register-email-group', 'register-email-error', 'Digite um email válido');
    valid = false;
  } else {
    markSuccess('register-email-group');
  }

  if (!password) {
    showError('register-password-group', 'register-password-error', 'Escolha uma senha');
    valid = false;
  } else if (password.length < 8) {
    showError('register-password-group', 'register-password-error', 'A senha deve ter no mínimo 8 caracteres');
    valid = false;
  } else {
    markSuccess('register-password-group');
  }

  if (!confirm) {
    showError('register-confirm-group', 'register-confirm-error', 'Confirme sua senha');
    valid = false;
  } else if (confirm !== password) {
    showError('register-confirm-group', 'register-confirm-error', 'As senhas não coincidem');
    valid = false;
  } else {
    markSuccess('register-confirm-group');
  }

  if (!terms) {
    const termsError = document.getElementById('terms-error');
    if (termsError) {
      termsError.textContent = '⚠ Você precisa aceitar os termos';
      termsError.style.opacity = '1';
    }
    valid = false;
  }

  if (!valid) return;

  // Simulate registration
  const submitBtn = document.getElementById('register-submit-btn');
  submitBtn.classList.add('loading');
  submitBtn.disabled = true;

  setTimeout(() => {
    const user = {
      name: name,
      email: email,
      avatar: name[0].toUpperCase(),
      method: 'email',
      joinedAt: new Date().toISOString()
    };
    loginSuccess(user, true);
  }, 1800);
});

// ---- SUCCESS FLOW ----
function loginSuccess(user, isNew = false) {
  setUser(user);

  const overlay = document.getElementById('success-overlay');
  const title = document.getElementById('success-title');
  const sub = document.getElementById('success-sub');
  const bar = document.getElementById('success-bar');

  title.textContent = isNew
    ? `Bem-vindo(a) à GOATCINE, ${user.name.split(' ')[0]}! 🎉`
    : `Bem-vindo de volta, ${user.name.split(' ')[0]}!`;

  sub.textContent = 'Preparando sua experiência cinematográfica...';

  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('show');

  // Loading bar animation
  let progress = 0;
  const barInterval = setInterval(() => {
    progress += Math.random() * 20 + 8;
    if (progress >= 100) {
      progress = 100;
      bar.style.width = '100%';
      clearInterval(barInterval);
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 300);
    } else {
      bar.style.width = progress + '%';
    }
  }, 90);
}

// ---- INIT ----
createParticles();
