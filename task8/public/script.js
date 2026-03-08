const TOKEN_KEY = 'task8_access_token';

const tabLogin = document.getElementById('tabLogin');
const tabRegister = document.getElementById('tabRegister');
const gotoRegister = document.getElementById('gotoRegister');
const gotoLogin = document.getElementById('gotoLogin');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authMessage = document.getElementById('authMessage');

function showMessage(text, type = 'error') {
  authMessage.textContent = text;
  authMessage.classList.remove('is-error', 'is-success');
  if (!text) return;
  authMessage.classList.add(type === 'success' ? 'is-success' : 'is-error');
}

function mapAuthError(status, data) {
  const rawError = String(data?.error || '').toLowerCase();
  if (status === 401 || rawError === 'invalid credentials') {
    return 'Неверный email или пароль';
  }
  if (status === 409) {
    return 'Пользователь с таким email уже существует';
  }
  if (status === 400) {
    return 'Проверьте корректность введенных данных';
  }
  return data?.error || 'Не удалось выполнить запрос';
}

async function safeJson(response) {
  try {
    return await response.json();
  } catch (_error) {
    return null;
  }
}

function setMode(mode) {
  const isLogin = mode === 'login';

  tabLogin.classList.toggle('is-active', isLogin);
  tabRegister.classList.toggle('is-active', !isLogin);
  loginForm.classList.toggle('is-active', isLogin);
  registerForm.classList.toggle('is-active', !isLogin);
  showMessage('');
}

tabLogin.addEventListener('click', () => setMode('login'));
tabRegister.addEventListener('click', () => setMode('register'));
gotoRegister.addEventListener('click', () => setMode('register'));
gotoLogin.addEventListener('click', () => setMode('login'));

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(loginForm).entries());
  showMessage('');

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await safeJson(response);

    if (response.ok && data?.accessToken) {
      localStorage.setItem(TOKEN_KEY, data.accessToken);
      window.location.href = '/site.html';
      return;
    }

    showMessage(mapAuthError(response.status, data));
  } catch (_error) {
    showMessage('Ошибка сети. Проверьте, что сервер запущен');
  }
});

registerForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = Object.fromEntries(new FormData(registerForm).entries());
  showMessage('');

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await safeJson(response);

    if (response.ok) {
      setMode('login');
      loginForm.email.value = payload.email;
      loginForm.password.focus();
      showMessage('Регистрация успешна. Теперь выполните вход.', 'success');
      return;
    }

    showMessage(mapAuthError(response.status, data));
  } catch (_error) {
    showMessage('Ошибка сети. Проверьте, что сервер запущен');
  }
});

if (localStorage.getItem(TOKEN_KEY)) {
  window.location.href = '/site.html';
}
