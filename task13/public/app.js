const STORAGE_KEY = 'task13_notes';

const noteForm = document.getElementById('noteForm');
const titleInput = document.getElementById('titleInput');
const textInput = document.getElementById('textInput');
const formMessage = document.getElementById('formMessage');
const notesGrid = document.getElementById('notesGrid');
const notesCount = document.getElementById('notesCount');
const sectionHint = document.getElementById('sectionHint');
const networkStatus = document.getElementById('networkStatus');
const swStatus = document.getElementById('swStatus');
const debugBox = document.getElementById('debugBox');
const seedBtn = document.getElementById('seedBtn');
const clearBtn = document.getElementById('clearBtn');

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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function showMessage(text, type = 'success') {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
}

function appendDebug(message) {
  const timestamp = new Date().toLocaleTimeString('ru-RU');
  debugBox.textContent = `[${timestamp}] ${message}\n${debugBox.textContent}`.trim();
}

function formatDate(value) {
  return new Date(value).toLocaleString('ru-RU');
}

function renderNotes() {
  const notes = loadNotes();
  notesCount.textContent = String(notes.length);

  if (notes.length === 0) {
    sectionHint.textContent = 'Пока заметок нет. Добавьте первую.';
    notesGrid.innerHTML = `
      <div class="empty-state">
        Заметок пока нет. Добавьте новую заметку через форму выше.
      </div>
    `;
    return;
  }

  sectionHint.textContent = 'Заметки доступны даже после перезагрузки и без сети.';
  notesGrid.innerHTML = notes
    .map(
      (note) => `
        <article class="note-card">
          <div class="note-meta">
            <span>${escapeHtml(note.id)}</span>
            <span>${escapeHtml(formatDate(note.createdAt))}</span>
          </div>
          <h3 class="note-title">${escapeHtml(note.title)}</h3>
          <p class="note-text">${escapeHtml(note.text)}</p>
          <div class="note-actions">
            <button class="note-delete" type="button" data-note-id="${escapeHtml(note.id)}">
              Удалить
            </button>
          </div>
        </article>
      `
    )
    .join('');
}

function addNote(title, text) {
  const notes = loadNotes();
  const note = {
    id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    title: title.trim(),
    text: text.trim(),
    createdAt: Date.now(),
  };

  notes.unshift(note);
  saveNotes(notes);
  renderNotes();
  return note;
}

function removeNote(noteId) {
  const notes = loadNotes().filter((note) => note.id !== noteId);
  saveNotes(notes);
  renderNotes();
}

function clearNotes() {
  localStorage.removeItem(STORAGE_KEY);
  renderNotes();
}

function setNetworkStatus() {
  networkStatus.textContent = navigator.onLine ? 'Онлайн' : 'Офлайн';
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    swStatus.textContent = 'Не поддерживается';
    appendDebug('Service Worker не поддерживается в этом браузере.');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    swStatus.textContent = 'Активен';
    appendDebug(`Service Worker зарегистрирован: ${registration.scope}`);
  } catch (error) {
    swStatus.textContent = 'Ошибка';
    appendDebug(`Ошибка регистрации Service Worker: ${error.message}`);
  }
}

noteForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const title = titleInput.value.trim();
  const text = textInput.value.trim();

  if (!title || !text) {
    showMessage('Заполните заголовок и текст заметки.', 'error');
    return;
  }

  const note = addNote(title, text);
  noteForm.reset();
  showMessage('Заметка сохранена локально.', 'success');
  appendDebug(`Добавлена заметка ${note.id}.`);
});

notesGrid.addEventListener('click', (event) => {
  const target = event.target.closest('[data-note-id]');
  if (!target) {
    return;
  }

  removeNote(target.dataset.noteId);
  showMessage('Заметка удалена.', 'success');
  appendDebug(`Удалена заметка ${target.dataset.noteId}.`);
});

seedBtn.addEventListener('click', () => {
  addNote(
    'Демо-заметка',
    'Это тестовая заметка для проверки офлайн-режима и localStorage.'
  );
  showMessage('Демо-заметка добавлена.', 'success');
  appendDebug('Добавлена демо-заметка.');
});

clearBtn.addEventListener('click', () => {
  clearNotes();
  showMessage('Все заметки очищены.', 'success');
  appendDebug('Очищены все заметки.');
});

window.addEventListener('online', () => {
  setNetworkStatus();
  appendDebug('Соединение восстановлено.');
});

window.addEventListener('offline', () => {
  setNetworkStatus();
  appendDebug('Приложение перешло в офлайн-режим.');
});

document.addEventListener('DOMContentLoaded', async () => {
  setNetworkStatus();
  renderNotes();
  appendDebug('Интерфейс загружен.');
  await registerServiceWorker();
});
