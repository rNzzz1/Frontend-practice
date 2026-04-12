const STORAGE_KEY = 'task15_notes';
const pageContainer = document.getElementById('pageContainer');
const httpsStatus = document.getElementById('httpsStatus');
const networkStatus = document.getElementById('networkStatus');
const swStatus = document.getElementById('swStatus');
const notesCount = document.getElementById('notesCount');

const routes = {
  home: '/content/home.html',
  about: '/content/about.html',
};

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

function updateNotesCount() {
  notesCount.textContent = String(loadNotes().length);
}

function setNetworkStatus() {
  networkStatus.textContent = navigator.onLine ? 'Онлайн' : 'Офлайн';
}

function setHttpsStatus() {
  httpsStatus.textContent = window.isSecureContext ? 'HTTPS / Secure' : 'Небезопасно';
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

function initHomePage() {
  const noteForm = document.getElementById('noteForm');
  const titleInput = document.getElementById('titleInput');
  const textInput = document.getElementById('textInput');
  const clearBtn = document.getElementById('clearBtn');
  const notesList = document.getElementById('notesList');

  if (!noteForm || !titleInput || !textInput || !clearBtn || !notesList) {
    return;
  }

  renderNotesList();

  noteForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const text = textInput.value.trim();

    if (!title || !text) {
      showFormMessage('Заполните оба поля.', 'error');
      return;
    }

    const notes = loadNotes();
    notes.unshift({
      id: Math.random().toString(36).slice(2, 8).toUpperCase(),
      title,
      text,
    });

    saveNotes(notes);
    noteForm.reset();
    renderNotesList();
    showFormMessage('Заметка сохранена локально.', 'success');
  });

  clearBtn.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY);
    renderNotesList();
    showFormMessage('Заметки очищены.', 'success');
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
  if (hash === 'about') {
    return 'about';
  }
  return 'home';
}

async function loadRoute() {
  const route = getCurrentRoute();
  const url = routes[route] || routes.home;

  setActiveRoute(route);

  try {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load route: ${route}`);
    }

    const html = await response.text();
    pageContainer.innerHTML = html;

    if (route === 'home') {
      initHomePage();
    }
  } catch (_error) {
    pageContainer.innerHTML = '<article class="loading-card">Не удалось загрузить страницу. Проверьте соединение.</article>';
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    swStatus.textContent = 'Не поддерживается';
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    swStatus.textContent = registration.active ? 'Активен' : 'Установлен';
  } catch (_error) {
    swStatus.textContent = 'Ошибка';
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
  await loadRoute();
});
