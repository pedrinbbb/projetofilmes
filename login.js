/* =============================================
   GOATCINE — Login Page Logic (API Real)
   ============================================= */

const API = '';  // mesmo servidor (porta 3000)

// ---- AUTH CHECK ----
// Se já tem token válido, ir direto para o site
(async function checkExisting() {
  const token = localStorage.getItem('goatcine_token');
  if (!token) return;
  try {
    const res = await fetch(`${API}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      window.location.replace('/');
    } else {
      // Token inválido — limpar
      localStorage.removeItem('goatcine_token');
      localStorage.removeItem('goatcine_user');
    }
  } catch {
    // Servidor offline — limpar token
    localStorage.removeItem('goatcine_token');
    localStorage.removeItem('goatcine_user');
  }
})();

// ---- PARTICLES ----
function createParticles() {
  const container = document.getElementById('bg-particles');
  if (!container) return;
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

// ---- CHECK AUTH ERROR FROM URL ----
(function checkUrlError() {
  const params = new URLSearchParams(window.location.search);
  const err = params.get('auth_error');
  if (!err) return;

  const msgs = {
    discord_not_configured: 'Discord OAuth não configurado no servidor. Configure o arquivo .env.',
    discord_denied:         'Autenticação com Discord cancelada.',
    discord_token_failed:   'Falha ao autenticar com Discord. Tente novamente.',
    discord_user_failed:    'Não foi possível obter seus dados do Discord.',
    server_error:           'Erro interno. Tente novamente mais tarde.',
  };

  // Show global error toast
  showApiError(msgs[err] || 'Erro ao autenticar com Discord');

  // Clean URL
  window.history.replaceState({}, '', '/login');
})();

// ---- TAB SWITCHING ----
const tabSlider  = document.getElementById('tab-slider');
const formLogin  = document.getElementById('form-login');
const formRegister = document.getElementById('form-register');

function switchTab(tab) {
  const isLogin = tab === 'login';

  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-register').classList.toggle('active', !isLogin);
  document.getElementById('tab-login').setAttribute('aria-selected', String(isLogin));
  document.getElementById('tab-register').setAttribute('aria-selected', String(!isLogin));

  tabSlider.classList.toggle('right', !isLogin);

  const outForm = isLogin ? formRegister : formLogin;
  const inForm  = isLogin ? formLogin : formRegister;

  outForm.classList.add('hidden');
  inForm.classList.remove('hidden');
  inForm.style.animation = 'none';
  inForm.offsetHeight;
  inForm.style.animation = '';
}

document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
document.getElementById('tab-register').addEventListener('click', () => switchTab('register'));
document.getElementById('go-register').addEventListener('click', () => switchTab('register'));
document.getElementById('go-login').addEventListener('click', () => switchTab('login'));

// ---- TOGGLE PASSWORD VISIBILITY ----
function initPasswordToggle(toggleId, inputId) {
  const btn   = document.getElementById(toggleId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;

  btn.addEventListener('click', () => {
    const isPass = input.type === 'password';
    input.type = isPass ? 'text' : 'password';
    btn.querySelector('.eye-icon').innerHTML = isPass
      ? `<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>`
      : `<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>`;
  });
}

initPasswordToggle('login-toggle-pass', 'login-password');
initPasswordToggle('register-toggle-pass', 'register-password');
initPasswordToggle('register-toggle-confirm', 'register-confirm');
initPasswordToggle('forgot-toggle-pass', 'forgot-new-password');
initPasswordToggle('forgot-toggle-confirm', 'forgot-confirm-password');


// ---- PASSWORD STRENGTH ----
const registerPassword = document.getElementById('register-password');
const strengthBar      = document.getElementById('strength-bar');
const strengthLabel    = document.getElementById('strength-label');

const strengthLevels = [
  { label: 'Muito fraca',   color: '#FF4444', width: '15%' },
  { label: 'Fraca',         color: '#FF8800', width: '35%' },
  { label: 'Razoável',      color: '#FFD700', width: '60%' },
  { label: 'Forte',         color: '#88DD00', width: '80%' },
  { label: 'Muito forte 💪', color: '#4ADE80', width: '100%' },
];

function checkStrength(pw) {
  let score = 0;
  if (pw.length >= 8)            score++;
  if (pw.length >= 12)           score++;
  if (/[A-Z]/.test(pw))          score++;
  if (/[0-9]/.test(pw))          score++;
  if (/[^A-Za-z0-9]/.test(pw))   score++;
  return Math.max(0, Math.min(score, 5));
}

if (registerPassword) {
  registerPassword.addEventListener('input', () => {
    const pw = registerPassword.value;
    if (!pw) {
      strengthBar.style.width = '0%';
      strengthLabel.textContent = '';
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
  document.getElementById(groupId)?.classList.add('error');
  document.getElementById(groupId)?.classList.remove('success');
  const el = document.getElementById(errorId);
  if (el) el.textContent = '⚠ ' + message;
}

function clearError(groupId, errorId) {
  document.getElementById(groupId)?.classList.remove('error');
  const el = document.getElementById(errorId);
  if (el) el.textContent = '';
}

function markSuccess(groupId) {
  const g = document.getElementById(groupId);
  if (g) { g.classList.remove('error'); g.classList.add('success'); }
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

// Global API error toast (no group)
function showApiError(msg) {
  // Inject a toast at top of auth container if not exists
  let toast = document.getElementById('api-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'api-toast';
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.style.cssText = `
      background: rgba(255,107,107,0.12);
      border: 1px solid rgba(255,107,107,0.35);
      color: #FF8080;
      border-radius: 10px;
      padding: 12px 16px;
      font-size: 13px;
      font-weight: 500;
      margin-bottom: 16px;
      animation: fade-slide-up 0.3s ease both;
      line-height: 1.5;
    `;
    const container = document.querySelector('.auth-container');
    container?.insertBefore(toast, container.firstChild);
  }
  toast.textContent = '⚠️ ' + msg;
  setTimeout(() => toast?.remove(), 6000);
}

function showApiSuccessMessage(msg) {
  let toast = document.getElementById('api-toast');
  if (toast) toast.remove();
  
  toast = document.createElement('div');
  toast.id = 'api-toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.style.cssText = `
    background: rgba(74, 222, 128, 0.12);
    border: 1px solid rgba(74, 222, 128, 0.35);
    color: #4ADE80;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 16px;
    animation: fade-slide-up 0.3s ease both;
    line-height: 1.5;
    text-align: center;
  `;
  toast.textContent = '✅ ' + msg;
  const container = document.querySelector('.auth-container');
  container?.insertBefore(toast, container.firstChild);
  
  setTimeout(() => toast?.remove(), 8000);
}

// ---- REAL-TIME VALIDATION ----
document.getElementById('login-email')?.addEventListener('input', function() {
  if (this.value && !isValidEmail(this.value)) showError('login-email-group', 'login-email-error', 'Email inválido');
  else { clearError('login-email-group', 'login-email-error'); if (this.value) markSuccess('login-email-group'); }
});

document.getElementById('register-email')?.addEventListener('input', function() {
  if (this.value && !isValidEmail(this.value)) showError('register-email-group', 'register-email-error', 'Email inválido');
  else { clearError('register-email-group', 'register-email-error'); if (this.value) markSuccess('register-email-group'); }
});

document.getElementById('register-confirm')?.addEventListener('input', function() {
  const pw = document.getElementById('register-password')?.value;
  if (this.value && this.value !== pw) showError('register-confirm-group', 'register-confirm-error', 'As senhas não coincidem');
  else { clearError('register-confirm-group', 'register-confirm-error'); if (this.value) markSuccess('register-confirm-group'); }
});

// ---- DISCORD AUTH (redireciona para o servidor) ----
function handleDiscordAuth() {
  window.location.href = '/auth/discord';
}

document.getElementById('login-discord-btn')?.addEventListener('click', handleDiscordAuth);
document.getElementById('register-discord-btn')?.addEventListener('click', handleDiscordAuth);


// ---- LOGIN FORM SUBMIT ----
document.getElementById('login-email-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();

  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  let valid = true;

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
  } else {
    markSuccess('login-password-group');
  }

  if (!valid) return;

  // Loading state
  const btn = document.getElementById('login-submit-btn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const res  = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      // Show specific error
      if (res.status === 401) {
        showError('login-email-group', 'login-email-error', ' ');
        showError('login-password-group', 'login-password-error', data.error || 'Email ou senha incorretos');
      } else {
        showApiError(data.error || 'Erro ao fazer login');
      }
      btn.classList.remove('loading');
      btn.disabled = false;
      return;
    }

    // Success!
    saveAuthAndRedirect(data.token, data.user);

  } catch (err) {
    showApiError('Servidor offline. Verifique se o servidor está rodando (npm start).');
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

// ---- REGISTER FORM SUBMIT ----
let isRegistering = false;
document.getElementById('register-email-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();

  if (isRegistering) return;

  const name     = document.getElementById('register-name').value.trim();
  const email    = document.getElementById('register-email').value.trim();
  const password = document.getElementById('register-password').value;
  const confirm  = document.getElementById('register-confirm').value;
  const terms    = document.getElementById('terms-check').checked;
  let valid = true;

  // Clear all
  ['register-name-group', 'register-email-group', 'register-password-group', 'register-confirm-group']
    .forEach(id => { document.getElementById(id)?.classList.remove('error', 'success'); });
  ['register-name-error', 'register-email-error', 'register-password-error', 'register-confirm-error', 'terms-error']
    .forEach(id => { const el = document.getElementById(id); if (el) el.textContent = ''; });

  if (!name || name.length < 2) {
    showError('register-name-group', 'register-name-error', 'Nome de usuário deve ter ao menos 2 caracteres');
    valid = false;
  } else { markSuccess('register-name-group'); }

  if (!email) {
    showError('register-email-group', 'register-email-error', 'O email é obrigatório');
    valid = false;
  } else if (!isValidEmail(email)) {
    showError('register-email-group', 'register-email-error', 'Digite um email válido');
    valid = false;
  } else { markSuccess('register-email-group'); }

  if (!password) {
    showError('register-password-group', 'register-password-error', 'Escolha uma senha');
    valid = false;
  } else if (password.length < 8) {
    showError('register-password-group', 'register-password-error', 'Mínimo 8 caracteres');
    valid = false;
  } else { markSuccess('register-password-group'); }

  if (!confirm) {
    showError('register-confirm-group', 'register-confirm-error', 'Confirme sua senha');
    valid = false;
  } else if (confirm !== password) {
    showError('register-confirm-group', 'register-confirm-error', 'As senhas não coincidem');
    valid = false;
  } else { markSuccess('register-confirm-group'); }

  if (!terms) {
    const el = document.getElementById('terms-error');
    if (el) { el.textContent = '⚠ Aceite os termos para continuar'; el.style.opacity = '1'; }
    valid = false;
  }

  if (!valid) return;

  isRegistering = true;
  const btn = document.getElementById('register-submit-btn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const res  = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      if (res.status === 409) {
        showError('register-email-group', 'register-email-error', data.error || 'Email já cadastrado');
      } else {
        showApiError(data.error || 'Erro ao criar conta');
      }
      btn.classList.remove('loading');
      btn.disabled = false;
      isRegistering = false;
      return;
    }

    // Sucesso no Cadastro Direto com Mensagem
    btn.classList.remove('loading');
    showApiSuccessMessage('Sua conta foi criada com sucesso! Redirecionando...');
    
    setTimeout(() => {
      isRegistering = false;
      saveAuthAndRedirect(data.token, data.user);
    }, 2200);

  } catch (err) {
    showApiError('Servidor offline. Verifique se o servidor está rodando (npm start).');
    btn.classList.remove('loading');
    btn.disabled = false;
    isRegistering = false;
  }
});

// ---- OTP FLOW LOGIC ----
let otpEmail = '';
let resendTimer = null;

function openOtpVerification(email, responseData) {
  otpEmail = email;
  document.getElementById('otp-email-display').textContent = email;
  
  // Show dev mode code if provided by server
  const devBox = document.getElementById('otp-dev-box');
  const devCode = document.getElementById('otp-dev-code');
  if (responseData.dev_code) {
    devCode.textContent = responseData.dev_code;
    devBox.classList.add('show');
  } else {
    devBox.classList.remove('show');
  }

  // Clear errors and inputs
  document.getElementById('otp-error').textContent = '';
  const inputs = document.querySelectorAll('.otp-input');
  inputs.forEach(input => {
    input.value = '';
    input.classList.remove('error', 'success');
  });

  // Open overlay
  const overlay = document.getElementById('otp-overlay');
  overlay.setAttribute('aria-hidden', 'false');
  overlay.classList.add('show');

  // Focus first input
  setTimeout(() => inputs[0].focus(), 100);

  // Start Resend Cooldown
  startResendCountdown(60);
}

// Bind OTP Inputs interactions (focus next/prev, paste)
const otpInputs = document.querySelectorAll('.otp-input');
otpInputs.forEach((input, idx) => {
  input.addEventListener('input', (e) => {
    const val = e.target.value;
    if (val.length === 1) {
      if (idx < otpInputs.length - 1) {
        otpInputs[idx + 1].focus();
      }
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !input.value) {
      if (idx > 0) {
        otpInputs[idx - 1].focus();
      }
    }
  });

  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      pastedData.split('').forEach((char, i) => {
        if (otpInputs[i]) {
          otpInputs[i].value = char;
        }
      });
      otpInputs[5].focus();
    }
  });
});

// Countdown helper
function startResendCountdown(seconds) {
  const resendBtn = document.getElementById('otp-resend-btn');
  const countdownEl = document.getElementById('otp-countdown');
  resendBtn.disabled = true;

  clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    seconds--;
    if (seconds <= 0) {
      clearInterval(resendTimer);
      resendBtn.disabled = false;
      countdownEl.textContent = '';
    } else {
      countdownEl.textContent = `Aguarde ${seconds}s para reenviar`;
    }
  }, 1000);
}

// Submit OTP Code
document.getElementById('otp-form')?.addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const errorEl = document.getElementById('otp-error');
  errorEl.textContent = '';

  // Get full 6 digits
  let code = '';
  let complete = true;
  otpInputs.forEach(input => {
    if (!input.value) {
      complete = false;
    }
    code += input.value;
  });

  if (!complete || code.length !== 6) {
    errorEl.textContent = 'Digite o código de 6 dígitos';
    return;
  }

  const btn = document.getElementById('otp-submit-btn');
  btn.classList.add('loading');
  btn.disabled = true;

  try {
    const res = await fetch(`${API}/api/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail, code }),
    });

    const data = await res.json();

    if (!res.ok) {
      errorEl.textContent = data.error || 'Código inválido';
      btn.classList.remove('loading');
      btn.disabled = false;
      return;
    }

    // Success! Hide OTP screen and switch to login tab
    document.getElementById('otp-overlay').classList.remove('show');
    document.getElementById('otp-overlay').setAttribute('aria-hidden', 'true');
    clearInterval(resendTimer);

    // Show a success message
    showApiSuccessMessage('Cadastro realizado com sucesso! Faça login na sua conta para continuar.');

    // Switch to Login Tab and pre-fill the email
    switchTab('login');
    const loginEmailInput = document.getElementById('login-email');
    if (loginEmailInput) {
      loginEmailInput.value = otpEmail;
      markSuccess('login-email-group');
      document.getElementById('login-password')?.focus();
    }

  } catch (err) {
    errorEl.textContent = 'Erro de conexão com o servidor';
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

// Resend Button handler
document.getElementById('otp-resend-btn')?.addEventListener('click', async () => {
  const errorEl = document.getElementById('otp-error');
  errorEl.textContent = '';
  
  try {
    const res = await fetch(`${API}/api/auth/resend-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: otpEmail }),
    });
    
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Erro ao reenviar';
      return;
    }

    if (data.dev_code) {
      document.getElementById('otp-dev-code').textContent = data.dev_code;
      document.getElementById('otp-dev-box').classList.add('show');
    }
    
    startResendCountdown(60);
  } catch (err) {
    errorEl.textContent = 'Erro de conexão com o servidor';
  }
});

// Back Button handler
document.getElementById('otp-back-btn')?.addEventListener('click', () => {
  document.getElementById('otp-overlay').classList.remove('show');
  document.getElementById('otp-overlay').setAttribute('aria-hidden', 'true');
  clearInterval(resendTimer);
});

// ---- SAVE AUTH & REDIRECT ----
function saveAuthAndRedirect(token, user, isNew = false) {
  localStorage.setItem('goatcine_token', token);
  localStorage.setItem('goatcine_user', JSON.stringify({
    id:     user.id,
    name:   user.name,
    email:  user.email,
    avatar: user.avatar,
    method: user.method,
  }));

  // Show success overlay
  const overlay   = document.getElementById('success-overlay');
  const titleEl   = document.getElementById('success-title');
  const subEl     = document.getElementById('success-sub');
  const barEl     = document.getElementById('success-bar');

  if (overlay) {
    titleEl.textContent = isNew
      ? `Conta criada! Bem-vindo(a), ${user.name.split(' ')[0]}! 🎉`
      : `Bem-vindo de volta, ${user.name.split(' ')[0]}!`;
    subEl.textContent = 'Carregando GOATCINE...';
    overlay.setAttribute('aria-hidden', 'false');
    overlay.classList.add('show');

    let p = 0;
    const iv = setInterval(async () => {
      p += Math.random() * 22 + 10;
      if (p >= 100) {
        p = 100;
        barEl.style.width = '100%';
        clearInterval(iv);
        setTimeout(async () => {
          // Check if user has profiles
          try {
            const res = await fetch('/api/profiles', {
              headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            const hasProfiles = Array.isArray(data.profiles) && data.profiles.length > 0;
            if (hasProfiles) {
              window.location.href = '/profiles.html';
            } else {
              window.location.href = '/profiles.html?new=true';
            }
          } catch {
            window.location.href = '/profiles.html?new=true';
          }
        }, 320);
      } else {
        barEl.style.width = p + '%';
      }
    }, 80);
  } else {
    window.location.href = '/profiles.html?new=true';
  }
}

// ---- Forgot Password Flow ----
(function initForgotPassword() {
  const forgotBtn = document.getElementById('forgot-btn');
  const forgotOverlay = document.getElementById('forgot-overlay');
  const forgotBackBtn = document.getElementById('forgot-back-btn');
  
  const emailForm = document.getElementById('forgot-email-form');
  const emailGroup = document.getElementById('forgot-email-group');
  const emailInput = document.getElementById('forgot-email');
  const emailError = document.getElementById('forgot-email-error');
  
  const resetForm = document.getElementById('forgot-reset-form');
  const codeGroup = document.getElementById('forgot-code-group');
  const codeInput = document.getElementById('forgot-code');
  const codeError = document.getElementById('forgot-code-error');
  const passGroup = document.getElementById('forgot-pass-group');
  const newPassInput = document.getElementById('forgot-new-password');
  const newPassError = document.getElementById('forgot-new-pass-error');
  const confirmGroup = document.getElementById('forgot-confirm-group');
  const confirmInput = document.getElementById('forgot-confirm-password');
  const confirmError = document.getElementById('forgot-confirm-error');
  const resendCodeBtn = document.getElementById('forgot-resend-code');
  
  const togglePassBtn = document.getElementById('forgot-toggle-pass');
  const toggleConfirmBtn = document.getElementById('forgot-toggle-confirm');

  let recoveryEmail = '';
  let resetCodeVerified = false;

  function setForgotError(group, errorEl, message) {
    group?.classList.add('error');
    group?.classList.remove('success');
    if (errorEl) errorEl.textContent = message;
  }

  function clearForgotError(group, errorEl) {
    group?.classList.remove('error');
    if (errorEl) errorEl.textContent = '';
  }

  function markForgotSuccess(group) {
    group?.classList.remove('error');
    group?.classList.add('success');
  }

  function setForgotPasswordStep(isVerified) {
    resetCodeVerified = isVerified;
    passGroup?.classList.toggle('hidden', !isVerified);
    confirmGroup?.classList.toggle('hidden', !isVerified);

    if (codeInput) {
      codeInput.disabled = isVerified;
    }
    if (isVerified) {
      markForgotSuccess(codeGroup);
    } else {
      codeGroup?.classList.remove('success');
    }

    const submitText = document.querySelector('#forgot-submit-btn .btn-text');
    if (submitText) {
      submitText.textContent = isVerified ? 'Alterar Senha' : 'Validar código';
    }

    if (isVerified) {
      const successAlert = document.getElementById('forgot-success-alert');
      if (successAlert) {
        successAlert.style.display = 'block';
        successAlert.innerHTML = `
          <span style="font-weight: 700; display: block; font-size: 13px; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Email validado</span>
          <span style="font-size: 12px; opacity: 0.9;">Agora crie sua nova senha para concluir a redefinição.</span>
        `;
      }
      setTimeout(() => newPassInput?.focus(), 120);
    }
  }


  if (forgotBtn) {
    forgotBtn.addEventListener('click', () => {
      forgotOverlay.setAttribute('aria-hidden', 'false');
      forgotOverlay.classList.add('show');
      
      // Reset forms state
      emailForm.classList.remove('hidden');
      resetForm.classList.add('hidden');
      emailInput.value = '';
      clearForgotError(emailGroup, emailError);
      codeInput.value = '';
      clearForgotError(codeGroup, codeError);
      newPassInput.value = '';
      clearForgotError(passGroup, newPassError);
      confirmInput.value = '';
      clearForgotError(confirmGroup, confirmError);
      setForgotPasswordStep(false);
      const successAlert = document.getElementById('forgot-success-alert');
      if (successAlert) {
        successAlert.style.display = 'none';
        successAlert.innerHTML = `
          <span style="font-weight: 700; display: block; font-size: 13px; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Email enviado</span>
          <span style="font-size: 12px; opacity: 0.9;">Enviamos um código para validar seu email. Confira também a caixa de Spam.</span>
        `;
      }
      recoveryEmail = '';
    });
  }

  if (forgotBackBtn) {
    forgotBackBtn.addEventListener('click', () => {
      forgotOverlay.setAttribute('aria-hidden', 'true');
      forgotOverlay.classList.remove('show');
    });
  }

  codeInput?.addEventListener('input', () => {
    codeInput.value = codeInput.value.replace(/\D/g, '').slice(0, 6);
    clearForgotError(codeGroup, codeError);
  });

  newPassInput?.addEventListener('input', () => clearForgotError(passGroup, newPassError));
  confirmInput?.addEventListener('input', () => clearForgotError(confirmGroup, confirmError));

  resendCodeBtn?.addEventListener('click', async () => {
    clearForgotError(codeGroup, codeError);

    if (!recoveryEmail) {
      setForgotError(codeGroup, codeError, 'Informe o email novamente para reenviar o código.');
      return;
    }

    resendCodeBtn.disabled = true;
    resendCodeBtn.textContent = 'Reenviando...';

    try {
      const response = await fetchWithTimeout('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: recoveryEmail })
      }, 30000);

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Não foi possível reenviar o código.');
      }

      codeInput.value = '';
      codeInput.disabled = false;
      setForgotPasswordStep(false);
      setTimeout(() => codeInput?.focus(), 120);

      const successAlert = document.getElementById('forgot-success-alert');
      if (successAlert) {
        successAlert.style.display = 'block';
        successAlert.innerHTML = `
          <span style="font-weight: 700; display: block; font-size: 13px; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Código reenviado</span>
          <span style="font-size: 12px; opacity: 0.9;">Enviamos um novo código para <strong>${recoveryEmail}</strong>.</span>
        `;
      }
    } catch (err) {
      setForgotError(codeGroup, codeError, err.name === 'AbortError'
        ? 'O envio ainda está demorando. Aguarde alguns segundos e tente novamente.'
        : err.message);
    } finally {
      resendCodeBtn.disabled = false;
      resendCodeBtn.textContent = 'Reenviar código';
    }
  });

  if (emailForm) {
    emailForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearForgotError(emailGroup, emailError);
      
      const email = emailInput.value.trim();
      if (!email) {
        setForgotError(emailGroup, emailError, 'O email é obrigatório.');
        return;
      }
      if (!isValidEmail(email)) {
        setForgotError(emailGroup, emailError, 'Digite um email válido.');
        return;
      }

      const sendBtn = document.getElementById('forgot-send-btn');
      if (sendBtn) {
        sendBtn.classList.add('loading');
        sendBtn.disabled = true;
      }

      try {
        const response = await fetchWithTimeout('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        }, 30000);
        
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao processar solicitação.');
        }

        recoveryEmail = email;
        markForgotSuccess(emailGroup);
        
        // Show reset code form
        emailForm.classList.add('hidden');
        resetForm.classList.remove('hidden');
        setForgotPasswordStep(false);
        codeInput.disabled = false;
        setTimeout(() => codeInput?.focus(), 120);

        // Exibir alerta de sucesso
        const successAlert = document.getElementById('forgot-success-alert');
        if (successAlert) {
          successAlert.style.display = 'block';
          successAlert.innerHTML = `
            <span style="font-weight: 700; display: block; font-size: 13px; text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">Email enviado</span>
            <span style="font-size: 12px; opacity: 0.9;">Enviamos um código para <strong>${email}</strong>. Confira também a caixa de Spam.</span>
          `;
        }
      } catch (err) {
        setForgotError(emailGroup, emailError, err.name === 'AbortError'
          ? 'O envio ainda está demorando. Aguarde alguns segundos e tente novamente.'
          : err.message);
      } finally {
        if (sendBtn) {
          sendBtn.classList.remove('loading');
          sendBtn.disabled = false;
        }
      }
    });
  }

  if (resetForm) {
    resetForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearForgotError(codeGroup, codeError);
      clearForgotError(passGroup, newPassError);
      clearForgotError(confirmGroup, confirmError);

      const code = codeInput.value.trim();
      const newPassword = newPassInput.value;
      const confirmPassword = confirmInput.value;

      let hasError = false;
      if (!code || code.length !== 6) {
        setForgotError(codeGroup, codeError, 'Código inválido. Deve possuir 6 caracteres.');
        hasError = true;
      }
      if (hasError) return;

      const submitBtn = document.getElementById('forgot-submit-btn');
      if (!resetCodeVerified && submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
      }

      if (!resetCodeVerified) {
        try {
          const response = await fetchWithTimeout('/api/auth/verify-reset-code', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: recoveryEmail, code })
          }, 10000);

          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || 'Código inválido.');
          }

          setForgotPasswordStep(true);
        } catch (err) {
          setForgotError(codeGroup, codeError, err.name === 'AbortError'
            ? 'A validação demorou demais. Tente novamente.'
            : err.message);
        } finally {
          if (submitBtn) {
            submitBtn.classList.remove('loading');
            submitBtn.disabled = false;
          }
        }
        return;
      }

      if (!newPassword || newPassword.length < 8) {
        setForgotError(passGroup, newPassError, 'A senha deve possuir no mínimo 8 caracteres.');
        hasError = true;
      }
      if (newPassword !== confirmPassword) {
        setForgotError(confirmGroup, confirmError, 'As senhas não coincidem.');
        hasError = true;
      }

      if (hasError) return;

      if (submitBtn) {
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;
      }

      try {
        const response = await fetchWithTimeout('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: recoveryEmail, code, password: newPassword })
        }, 10000);

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Erro ao redefinir a senha.');
        }

        // Success! Hide reset overlay
        forgotOverlay.setAttribute('aria-hidden', 'true');
        forgotOverlay.classList.remove('show');

        // Show success overlay
        const overlay = document.getElementById('success-overlay');
        const titleEl = document.getElementById('success-title');
        const subEl   = document.getElementById('success-sub');
        const barEl   = document.getElementById('success-bar');

        if (overlay) {
          titleEl.textContent = 'Senha alterada com sucesso! 🎉';
          subEl.textContent = 'Redirecionando para login...';
          overlay.setAttribute('aria-hidden', 'false');
          overlay.classList.add('show');

          let p = 0;
          const iv = setInterval(() => {
            p += 25;
            if (p >= 100) {
              barEl.style.width = '100%';
              clearInterval(iv);
              setTimeout(() => {
                window.location.reload();
              }, 400);
            } else {
              barEl.style.width = p + '%';
            }
          }, 150);
        } else {
          alert('Senha redefinida com sucesso!');
          window.location.reload();
        }

      } catch (err) {
        setForgotError(codeGroup, codeError, err.name === 'AbortError'
          ? 'A redefinição demorou demais. Tente novamente.'
          : err.message);
      } finally {
        if (submitBtn) {
          submitBtn.classList.remove('loading');
          submitBtn.disabled = false;
        }
      }
    });
  }
})();

// ---- INIT ----
createParticles();
