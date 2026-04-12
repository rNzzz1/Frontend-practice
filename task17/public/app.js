const STORAGE_KEY = 'task17_notes';
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

let socket = null;
let swRegistration = null;
let swMessageListenerAttached = false;
const runtimeEvents = [];

function createNoteId() {
  return `N${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDateTime(timestamp) {
  const date = new Date(Number(timestamp));
  if (Number.isNaN(date.getTime())) {
    return 'Некорректная дата';
  }

  return date.toLocaleString('ru-RU');
}

function loadNotes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((note) => {
        const text = typeof note.text === 'string' ? note.text.trim() : '';
        const reminderValue = Number(note.reminder);

        return {
          id: note.id ? String(note.id) : createNoteId(),
          text,
          reminder: Number.isFinite(reminderValue) && reminderValue > 0 ? reminderValue : null,
          createdAt: Number(note.createdAt) || Date.now(),
        };
      })
      .filter((note) => note.text.length > 0);
  } catch (_error) {
    return [];
  }
}

function saveNotes(notes) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function updateNotesCount() {
  notesCount.textContent = String(loadNotes().length);
}

function setHttpsStatus() {
  if (!window.isSecureContext) {
    httpsStatus.textContent = 'Небезопасно';
    return;
  }

  httpsStatus.textContent = window.location.protocol === 'https:' ? 'HTTPS / Secure' : 'HTTP localhost / Secure';
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
  const notesList = document.getElementById('notes-list');
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
    .map((note) => {
      const reminderInfo = note.reminder
        ? `<span class="note-reminder">⏰ Напоминание: ${escapeHtml(formatDateTime(note.reminder))}</span>`
        : '<span class="note-reminder off">Без напоминания</span>';

      return `
        <article class="note-card">
          <p>${escapeHtml(note.text)}</p>
          <div class="note-meta">
            <span class="note-id">${escapeHtml(note.id)}</span>
            ${reminderInfo}
            <button class="note-remove" data-note-id="${escapeHtml(note.id)}" type="button">Удалить</button>
          </div>
        </article>
      `;
    })
    .join('');
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();

  let payload = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch (_error) {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    const errorMessage = payload && payload.error ? payload.error : `Request failed: ${response.status}`;
    throw new Error(errorMessage);
  }

  return payload;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replaceAll('-', '+').replaceAll('_', '/');
  const rawData = atob(normalized);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

function normalizeSubscription(subscription) {
  return typeof subscription.toJSON === 'function' ? subscription.toJSON() : subscription;
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    swStatus.textContent = 'Не поддерживается';
    return null;
  }

  if (!window.isSecureContext) {
    swStatus.textContent = 'Недоступен';
    addRuntimeEvent('SW недоступен: страница не в secure context (открой localhost по HTTPS или HTTP localhost).');
    return null;
  }

  async function tryRegister() {
    const registration = await navigator.serviceWorker.register('/sw.js');
    swRegistration = await navigator.serviceWorker.ready;
    swStatus.textContent = registration.active ? 'Активен' : 'Установлен';
    return swRegistration;
  }

  try {
    return await tryRegister();
  } catch (firstError) {
    // Try to recover from stale/broken registrations.
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((reg) => reg.unregister()));
      return await tryRegister();
    } catch (secondError) {
      const message =
        (secondError && secondError.message) ||
        (firstError && firstError.message) ||
        'unknown error';
      swStatus.textContent = 'Ошибка SW';
      addRuntimeEvent(`Ошибка регистрации SW: ${message}`);
      showFormMessage(`Service Worker не запущен: ${message}`, 'error');
    }
    return null;
  }
}

function attachServiceWorkerMessageListener() {
  if (!('serviceWorker' in navigator) || swMessageListenerAttached) {
    return;
  }

  navigator.serviceWorker.addEventListener('message', (event) => {
    const payload = event && event.data ? event.data : null;
    if (!payload || payload.type !== 'push-received') {
      return;
    }

    const title = payload.title ? String(payload.title) : 'Push';
    const body = payload.body ? String(payload.body) : '';
    addRuntimeEvent(`SW получил push: ${title}${body ? ` — ${body}` : ''}`);
  });

  swMessageListenerAttached = true;
}

async function getPushSubscription() {
  if (!swRegistration || !swRegistration.pushManager) {
    return null;
  }

  return swRegistration.pushManager.getSubscription();
}

async function syncSubscriptionOnServer(subscription) {
  return fetchJson('/api/push/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription }),
  });
}

async function removeSubscriptionFromServer(subscription) {
  return fetchJson('/api/push/unsubscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription }),
  });
}

async function syncExistingSubscription(silent = true) {
  const subscription = await getPushSubscription();
  if (!subscription) {
    return false;
  }

  try {
    const result = await syncSubscriptionOnServer(normalizeSubscription(subscription));
    if (!silent) {
      addRuntimeEvent(`Push подписка синхронизирована. Подписок на сервере: ${result.totalSubscriptions}.`);
    }
    return true;
  } catch (error) {
    if (!silent) {
      addRuntimeEvent(`Ошибка синхронизации подписки: ${error.message}`);
    }
    return false;
  }
}

async function updatePushUi() {
  const hint = document.getElementById('pushHint');
  const enableBtn = document.getElementById('enablePushBtn');
  const disableBtn = document.getElementById('disablePushBtn');
  const testBtn = document.getElementById('testPushBtn');

  if (!hint || !enableBtn || !disableBtn || !testBtn) {
    return;
  }

  if (!window.isSecureContext) {
    pushStatus.textContent = 'Недоступно';
    hint.textContent = 'Откройте приложение по HTTPS.';
    enableBtn.disabled = true;
    disableBtn.disabled = true;
    testBtn.disabled = true;
    return;
  }

  if (!('PushManager' in window) || !('Notification' in window)) {
    pushStatus.textContent = 'Не поддерживается';
    hint.textContent = 'Этот браузер не поддерживает Push API.';
    enableBtn.disabled = true;
    disableBtn.disabled = true;
    testBtn.disabled = true;
    return;
  }

  if (!swRegistration) {
    pushStatus.textContent = 'SW не активен';
    hint.textContent = 'Service Worker не зарегистрирован.';
    enableBtn.disabled = true;
    disableBtn.disabled = true;
    testBtn.disabled = true;
    return;
  }

  if (Notification.permission === 'denied') {
    pushStatus.textContent = 'Запрещено';
    hint.textContent = 'Разрешите уведомления в браузере и в настройках macOS.';
    enableBtn.disabled = true;
    disableBtn.disabled = true;
    testBtn.disabled = true;
    return;
  }

  const subscription = await getPushSubscription();

  if (subscription) {
    const synced = await syncExistingSubscription(true);

    if (synced) {
      pushStatus.textContent = 'Включены';
      hint.textContent = 'Push работает. Можно отправить тестовое уведомление.';
      enableBtn.disabled = true;
      disableBtn.disabled = false;
      testBtn.disabled = false;
      return;
    }

    pushStatus.textContent = 'Требуется синхронизация';
    hint.textContent = 'Подписка есть в браузере, но не синхронизирована с сервером. Нажмите «Включить Push».';
    enableBtn.disabled = false;
    disableBtn.disabled = false;
    testBtn.disabled = true;
    return;
  }

  pushStatus.textContent = 'Отключены';
  hint.textContent = 'Нажмите «Включить Push», затем проверьте кнопкой «Тест Push».';
  enableBtn.disabled = false;
  disableBtn.disabled = true;
  testBtn.disabled = true;
}

async function enablePush() {
  if (!window.isSecureContext) {
    showFormMessage('Push работает только через HTTPS.', 'error');
    return;
  }

  if (!swRegistration) {
    showFormMessage('Service Worker не зарегистрирован.', 'error');
    return;
  }

  let permission = Notification.permission;
  if (permission === 'default') {
    permission = await Notification.requestPermission();
  }

  if (permission !== 'granted') {
    showFormMessage('Разрешение на уведомления не выдано.', 'error');
    await updatePushUi();
    return;
  }

  const data = await fetchJson('/api/push/public-key');
  if (!data.publicKey) {
    throw new Error('Public VAPID key missing');
  }

  const existing = await getPushSubscription();
  if (existing) {
    try {
      await removeSubscriptionFromServer(normalizeSubscription(existing));
    } catch (_error) {
      // Subscription may be absent on server after restart.
    }

    await existing.unsubscribe();
  }

  const subscription = await swRegistration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(data.publicKey),
  });

  const result = await syncSubscriptionOnServer(normalizeSubscription(subscription));

  showFormMessage(`Push-уведомления включены. Подписок на сервере: ${result.totalSubscriptions}.`, 'success');
  addRuntimeEvent('Push подписка активирована заново и синхронизирована.');
  await updatePushUi();
}

async function disablePush() {
  if (!swRegistration) {
    showFormMessage('Service Worker не зарегистрирован.', 'error');
    return;
  }

  const subscription = await getPushSubscription();
  if (!subscription) {
    showFormMessage('Push уже отключен.', 'success');
    await updatePushUi();
    return;
  }

  try {
    await removeSubscriptionFromServer(normalizeSubscription(subscription));
  } catch (_error) {
    // Ignore server-side remove failures.
  }

  await subscription.unsubscribe();

  showFormMessage('Push-уведомления отключены.', 'success');
  addRuntimeEvent('Push-подписка удалена.');
  await updatePushUi();
}

async function sendTestPush() {
  const synced = await syncExistingSubscription(false);
  if (!synced) {
    showFormMessage('Не удалось синхронизировать подписку. Нажмите «Включить Push».', 'error');
    await updatePushUi();
    return;
  }

  const now = new Date().toLocaleTimeString('ru-RU');
  const result = await fetchJson('/api/push/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: 'Тест push-уведомления',
      body: `Проверка с сервера в ${now}`,
    }),
  });

  showFormMessage(`Тест отправлен: доставлено ${result.sent} из ${result.targeted}.`, 'success');
  addRuntimeEvent(`Тест push: доставлено ${result.sent}, ошибок ${result.failed}.`);

  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification('Локальная проверка уведомлений', {
        body: 'Если это окно видно, macOS не блокирует уведомления браузера.',
        icon: '/icons/icon-192.png',
      });
    } catch (_error) {
      // No-op: system-level notification policies may block popup notifications.
    }
  }
}

async function scheduleReminderOnServer(note) {
  return fetchJson('/api/reminders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: note.id,
      text: note.text,
      reminderTime: note.reminder,
    }),
  });
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

  socket.on('note-created', (payload) => {
    if (!payload || !payload.text) {
      return;
    }

    addRuntimeEvent(`Другая вкладка добавила заметку: ${payload.text}`);
  });

  socket.on('reminder-planned', (payload) => {
    if (!payload || !payload.text || !payload.reminderTime) {
      return;
    }

    addRuntimeEvent(`Запланировано напоминание: ${payload.text} (${formatDateTime(payload.reminderTime)})`);
  });

  socket.on('reminder-error', (payload) => {
    const message = payload && payload.error ? payload.error : 'Ошибка планирования напоминания';
    addRuntimeEvent(`Сервер сообщил ошибку: ${message}`);
  });
}

async function addNote(text, reminderTimestamp = null) {
  const notes = loadNotes();
  const note = {
    id: createNoteId(),
    text,
    reminder: reminderTimestamp,
    createdAt: Date.now(),
  };

  notes.unshift(note);
  saveNotes(notes);
  renderNotesList();

  if (reminderTimestamp) {
    try {
      const result = await scheduleReminderOnServer(note);
      addRuntimeEvent(`Напоминание запланировано на ${formatDateTime(result.reminderTime)}.`);
      showFormMessage('Заметка с напоминанием сохранена и отправлена на сервер.', 'success');
    } catch (error) {
      addRuntimeEvent(`Не удалось запланировать напоминание: ${error.message}`);
      showFormMessage(`Заметка сохранена локально, но без push: ${error.message}`, 'error');
    }
    return;
  }

  if (socket && socket.connected) {
    socket.emit('newTask', {
      text: note.text,
      timestamp: Date.now(),
    });
  }

  addRuntimeEvent('Обычная заметка добавлена.');
  showFormMessage('Заметка сохранена.', 'success');
}

function initHomePage() {
  const noteForm = document.getElementById('note-form');
  const noteInput = document.getElementById('note-input');
  const reminderForm = document.getElementById('reminder-form');
  const reminderText = document.getElementById('reminder-text');
  const reminderTime = document.getElementById('reminder-time');
  const notesList = document.getElementById('notes-list');
  const clearBtn = document.getElementById('clearNotesBtn');
  const enablePushBtn = document.getElementById('enablePushBtn');
  const disablePushBtn = document.getElementById('disablePushBtn');
  const testPushBtn = document.getElementById('testPushBtn');

  if (
    !noteForm ||
    !noteInput ||
    !reminderForm ||
    !reminderText ||
    !reminderTime ||
    !notesList ||
    !clearBtn ||
    !enablePushBtn ||
    !disablePushBtn ||
    !testPushBtn
  ) {
    return;
  }

  renderNotesList();
  renderEvents();

  updatePushUi().catch((error) => {
    addRuntimeEvent(`Ошибка UI push: ${error.message}`);
  });

  enablePushBtn.addEventListener('click', () => {
    enablePush().catch((error) => {
      showFormMessage(error.message || 'Не удалось включить push.', 'error');
    });
  });

  disablePushBtn.addEventListener('click', () => {
    disablePush().catch((error) => {
      showFormMessage(error.message || 'Не удалось отключить push.', 'error');
    });
  });

  testPushBtn.addEventListener('click', () => {
    sendTestPush().catch((error) => {
      showFormMessage(error.message || 'Не удалось отправить тестовый push.', 'error');
    });
  });

  noteForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const text = noteInput.value.trim();
    if (!text) {
      showFormMessage('Введите текст заметки.', 'error');
      return;
    }

    await addNote(text);
    noteInput.value = '';
  });

  reminderForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const text = reminderText.value.trim();
    const dateTime = reminderTime.value;

    if (!text || !dateTime) {
      showFormMessage('Заполните текст и дату напоминания.', 'error');
      return;
    }

    const timestamp = new Date(dateTime).getTime();
    if (!Number.isFinite(timestamp)) {
      showFormMessage('Некорректный формат даты.', 'error');
      return;
    }

    if (timestamp <= Date.now()) {
      showFormMessage('Дата напоминания должна быть в будущем.', 'error');
      return;
    }

    await addNote(text, timestamp);
    reminderText.value = '';
    reminderTime.value = '';
  });

  clearBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    renderNotesList();
    showFormMessage('Локальные заметки очищены.', 'success');
    addRuntimeEvent('Список заметок очищен.');
  });

  notesList.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-note-id]');
    if (!removeButton) {
      return;
    }

    const noteId = removeButton.dataset.noteId;
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

  setHttpsStatus();
  setNetworkStatus();
  updateNotesCount();

  await registerServiceWorker();
  attachServiceWorkerMessageListener();
  await syncExistingSubscription(true);

  initSocket();
  await loadRoute();
});
