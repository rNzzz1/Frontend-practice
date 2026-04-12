const STORAGE_KEY = 'task16_notes';
const NOTIFY_ENABLED_KEY = 'task16_notify_enabled';
const MAX_EVENTS = 12;

const pageContainer = document.getElementById('pageContainer');
const httpsStatus = document.getElementById('httpsStatus');
const networkStatus = document.getElementById('networkStatus');
const swStatus = document.getElementById('swStatus');
const socketStatus = document.getElementById('socketStatus');
const pushStatus = document.getElementById('pushStatus');
const notesCount = document.getElementById('notesCount');

const routes = {
  home: '/content/home.html',
  about: '/content/about.html',
};

const clientId =
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

let socket = null;
const runtimeEvents = [];

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_error) {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function isNotificationsEnabled() {
  return localStorage.getItem(NOTIFY_ENABLED_KEY) === '1';
}

function setNotificationsEnabled(enabled) {
  localStorage.setItem(NOTIFY_ENABLED_KEY, enabled ? '1' : '0');
}

function canUseNotificationApi() {
  return 'Notification' in window;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function updateNotesCount() {
  notesCount.textContent = String(loadNotes().length);
}

function setHttpsStatus() {
  httpsStatus.textContent = window.isSecureContext ? 'HTTPS / Secure' : 'Небезопасно';
}

function setNetworkStatus() {
  networkStatus.textContent = navigator.onLine ? 'Онлайн' : 'Офлайн';
}

function setActiveRoute(route) {
  const homeLink = document.getElementById('routeHome');
  const aboutLink = document.getElementById('routeAbout');
  homeLink.classList.toggle('is-active', route === 'home');
  aboutLink.classList.toggle('is-active', route === 'about');
}

function showFormMessage(text, type = '') {
  const formMessage = document.getElementById('formMessage');
  if (!formMessage) {
    return;
  }

  formMessage.className = `form-message ${type}`.trim();
  formMessage.textContent = text;
}

function addRuntimeEvent(text) {
  runtimeEvents.unshift({
    id: Math.random().toString(36).slice(2, 9),
    text,
    createdAt: new Date().toLocaleTimeString('ru-RU'),
  });

  if (runtimeEvents.length > MAX_EVENTS) {
    runtimeEvents.length = MAX_EVENTS;
  }

  renderEvents();
}

function renderEvents() {
  const eventsList = document.getElementById('eventsList');
  if (!eventsList) {
    return;
  }

  if (runtimeEvents.length === 0) {
    eventsList.innerHTML = '<article class="empty-card">Пока событий нет.</article>';
    return;
  }

  eventsList.innerHTML = runtimeEvents
    .map(
      (event) => `
        <article class="event-card">
          <p>${escapeHtml(event.text)}</p>
          <span>${escapeHtml(event.createdAt)}</span>
        </article>
      `
    )
    .join('');
}

function renderNotesList() {
  const notesList = document.getElementById('notesList');
  if (!notesList) {
    return;
  }

  const notes = loadNotes();
  updateNotesCount();

  if (notes.length === 0) {
    notesList.innerHTML = '<article class="empty-card">Пока заметок нет. Добавьте первую.</article>';
    return;
  }

  notesList.innerHTML = notes
    .map(
      (note) => `
        <article class="note-card">
          <h3>${escapeHtml(note.title)}</h3>
          <p>${escapeHtml(note.text)}</p>
          <div class="note-meta">
            <span class="note-id">${escapeHtml(note.id)}</span>
            <button class="note-remove" data-note-id="${escapeHtml(note.id)}" type="button">Удалить</button>
          </div>
        </article>
      `
    )
    .join('');
}

async function showBrowserNotification(message) {
  if (!isNotificationsEnabled()) {
    return;
  }

  if (!canUseNotificationApi() || Notification.permission !== 'granted') {
    return;
  }

  try {
    new Notification('Realtime Notes', {
      body: message,
      icon: '/icons/icon-192.png',
    });
  } catch (_error) {
    // Keep silent fallback: event is still visible in UI.
  }
}

async function updatePushUi() {
  const pushHint = document.getElementById('pushHint');
  const enableBtn = document.getElementById('enablePushBtn');
  const disableBtn = document.getElementById('disablePushBtn');

  if (!pushHint || !enableBtn || !disableBtn) {
    return;
  }

  if (!window.isSecureContext) {
    pushStatus.textContent = 'Недоступно';
    pushHint.textContent = 'Откройте приложение по HTTPS.';
    enableBtn.disabled = true;
    disableBtn.disabled = true;
    return;
  }

  if (!canUseNotificationApi()) {
    pushStatus.textContent = 'Не поддерживается';
    pushHint.textContent = 'Уведомления не поддерживаются этим браузером.';
    enableBtn.disabled = true;
    disableBtn.disabled = true;
    return;
  }

  if (Notification.permission === 'denied') {
    pushStatus.textContent = 'Запрещено';
    pushHint.textContent = 'Разрешите уведомления в настройках браузера.';
    enableBtn.disabled = true;
    disableBtn.disabled = true;
    return;
  }

  if (isNotificationsEnabled() && Notification.permission === 'granted') {
    pushStatus.textContent = 'Включены';
    pushHint.textContent = 'Уведомления активны (без Service Worker).';
    enableBtn.disabled = true;
    disableBtn.disabled = false;
    return;
  }

  pushStatus.textContent = 'Отключены';
  pushHint.textContent = 'Нажмите «Включить уведомления» и дайте разрешение браузера.';
  enableBtn.disabled = false;
  disableBtn.disabled = true;
}

async function enableNotifications() {
  if (!window.isSecureContext) {
    showFormMessage('Уведомления доступны только по HTTPS.', 'error');
    return;
  }

  if (!canUseNotificationApi()) {
    showFormMessage('Браузер не поддерживает уведомления.', 'error');
    return;
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    showFormMessage('Разрешение на уведомления не получено.', 'error');
    setNotificationsEnabled(false);
    await updatePushUi();
    return;
  }

  setNotificationsEnabled(true);
  showFormMessage('Уведомления включены.', 'success');
  addRuntimeEvent('Уведомления включены пользователем.');
  await updatePushUi();
}

async function disableNotifications() {
  setNotificationsEnabled(false);
  showFormMessage('Уведомления отключены.', 'success');
  addRuntimeEvent('Уведомления отключены пользователем.');
  await updatePushUi();
}

function initSocket() {
  if (socket) {
    return;
  }

  socket = io();

  socket.on('connect', () => {
    socketStatus.textContent = 'Подключен';
  });

  socket.on('disconnect', () => {
    socketStatus.textContent = 'Отключен';
  });

  socket.on('note-created', async (payload) => {
    if (!payload || payload.senderId === clientId) {
      return;
    }

    const message = payload.message || 'Другая вкладка добавила заметку.';
    addRuntimeEvent(message);

    if (window.location.hash === '#home') {
      showFormMessage(message, 'success');
    }

    if (document.visibilityState === 'hidden') {
      await showBrowserNotification(message);
    }
  });
}

function initHomePage() {
  const noteForm = document.getElementById('noteForm');
  const titleInput = document.getElementById('titleInput');
  const textInput = document.getElementById('textInput');
  const clearBtn = document.getElementById('clearBtn');
  const notesList = document.getElementById('notesList');
  const enablePushBtn = document.getElementById('enablePushBtn');
  const disablePushBtn = document.getElementById('disablePushBtn');

  if (!noteForm || !titleInput || !textInput || !clearBtn || !notesList || !enablePushBtn || !disablePushBtn) {
    return;
  }

  renderNotesList();
  renderEvents();
  updatePushUi();

  enablePushBtn.addEventListener('click', () => {
    enableNotifications().catch(() => {
      showFormMessage('Не удалось включить уведомления.', 'error');
    });
  });

  disablePushBtn.addEventListener('click', () => {
    disableNotifications().catch(() => {
      showFormMessage('Не удалось отключить уведомления.', 'error');
    });
  });

  noteForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const text = textInput.value.trim();

    if (!title || !text) {
      showFormMessage('Заполните оба поля.', 'error');
      return;
    }

    const notes = loadNotes();
    const note = {
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      title,
      text,
    };

    notes.unshift(note);
    saveNotes(notes);
    noteForm.reset();
    renderNotesList();

    const message = `Добавлена заметка: ${note.title}`;
    addRuntimeEvent(message);
    showFormMessage('Заметка сохранена.', 'success');

    if (socket && socket.connected) {
      socket.emit('note-created', {
        senderId: clientId,
        title: note.title,
        message,
      });
    }
  });

  clearBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    renderNotesList();
    showFormMessage('Заметки очищены.', 'success');
    addRuntimeEvent('Локальные заметки очищены.');
  });

  notesList.addEventListener('click', (event) => {
    const removeBtn = event.target.closest('[data-note-id]');
    if (!removeBtn) {
      return;
    }

    const noteId = removeBtn.dataset.noteId;
    const notes = loadNotes().filter((note) => note.id !== noteId);
    saveNotes(notes);
    renderNotesList();
    showFormMessage('Заметка удалена.', 'success');
  });
}

function getCurrentRoute() {
  const hash = window.location.hash.replace('#', '').trim();
  return hash === 'about' ? 'about' : 'home';
}

async function loadRoute() {
  const route = getCurrentRoute();
  const url = routes[route] || routes.home;

  setActiveRoute(route);

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Route load failed');
    }

    pageContainer.innerHTML = await response.text();

    if (route === 'home') {
      initHomePage();
    }
  } catch (_error) {
    pageContainer.innerHTML = '<article class="loading-card">Не удалось загрузить страницу.</article>';
  }
}

window.addEventListener('hashchange', () => {
  loadRoute();
});

window.addEventListener('online', setNetworkStatus);
window.addEventListener('offline', setNetworkStatus);

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.location.hash) {
    window.location.hash = '#home';
  }

  swStatus.textContent = 'Не используется';
  setHttpsStatus();
  setNetworkStatus();
  updateNotesCount();

  initSocket();
  await loadRoute();
});
