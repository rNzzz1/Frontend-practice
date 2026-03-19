const ACCESS_TOKEN_KEY = 'task11_access_token';
const REFRESH_TOKEN_KEY = 'task11_refresh_token';

const productList = document.getElementById('productList');
const status = document.getElementById('status');
const userLine = document.getElementById('userLine');
const roleBadge = document.getElementById('roleBadge');
const permissionLine = document.getElementById('permissionLine');
const accessResult = document.getElementById('accessResult');
const actionHint = document.getElementById('actionHint');
const reloadBtn = document.getElementById('reloadBtn');
const logoutBtn = document.getElementById('logoutBtn');
const checkRoleBtn = document.getElementById('checkRoleBtn');
const checkAdminBtn = document.getElementById('checkAdminBtn');
const createBtn = document.getElementById('createBtn');
const updateBtn = document.getElementById('updateBtn');
const deleteBtn = document.getElementById('deleteBtn');

let currentUser = null;
let productsCache = [];

const metaByTitle = {
  'Logitech G Pro X': { stock: 15, rating: 4.8, image: '/assets/gpro_keyboard.png' },
  'Razer DeathAdder V3': { stock: 25, rating: 4.7, image: '/assets/razer.jpg' },
  'SteelSeries Arctis 7': { stock: 10, rating: 4.6, image: '/assets/steel.jpg' },
  'HyperX Pulsefire': { stock: 30, rating: 4.4, image: '/assets/hyperx.webp' },
  'Corsair K95': { stock: 8, rating: 4.9, image: '/assets/k95.png' },
  'Xbox Controller': { stock: 40, rating: 4.8, image: '/assets/xbox.jpg' },
  'PlayStation DualSense': { stock: 35, rating: 4.9, image: '/assets/ps5.png' },
  'Razer Mousepad XXL': { stock: 50, rating: 4.5, image: '/assets/razer2.webp' },
  'Logitech G733': { stock: 12, rating: 4.6, image: '/assets/log.webp' },
  'Asus ROG Keyboard': { stock: 6, rating: 4.7, image: '/assets/asus.webp' },
};

function authHeaders() {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

function saveTokens(payload) {
  if (payload?.accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
  }
  if (payload?.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, payload.refreshToken);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function productCard(product) {
  const meta = metaByTitle[product.title] || {};
  const image = meta.image || '/assets/gpro_keyboard.png';
  const stock = meta.stock ?? 'n/a';
  const rating = meta.rating ?? 'n/a';

  return `
    <article class="product-card">
      <img class="product-image" src="${image}" alt="${escapeHtml(product.title)}" />
      <div>
        <div class="product-row">
          <h3 class="product-title">${escapeHtml(product.title)}</h3>
          <span class="product-id">ID: ${escapeHtml(product.id)}</span>
        </div>
        <p class="product-meta"><strong>Категория:</strong> ${escapeHtml(product.category)}</p>
        <p class="product-meta">${escapeHtml(product.description)}</p>
        <p class="product-meta"><strong>Цена:</strong> $${product.price}</p>
        <p class="product-meta"><strong>В наличии:</strong> ${stock}</p>
        <p class="product-meta"><strong>Рейтинг:</strong> ⭐ ${rating}</p>
      </div>
    </article>
  `;
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
}

async function refreshSession() {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) {
    return false;
  }

  const { response, data } = await request('/api/auth/refresh', {
    method: 'POST',
    headers: {
      'x-refresh-token': refreshToken,
    },
  });

  if (!response.ok || !data?.accessToken || !data?.refreshToken) {
    clearTokens();
    return false;
  }

  saveTokens(data);
  return true;
}

async function authRequest(path, options = {}) {
  let result = await request(path, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });

  if (result.response.status !== 401) {
    return result;
  }

  const refreshed = await refreshSession();
  if (!refreshed) {
    return result;
  }

  return request(path, {
    ...options,
    headers: {
      ...authHeaders(),
      ...(options.headers || {}),
    },
  });
}

function updateRoleUI() {
  const role = currentUser?.role || 'user';
  roleBadge.textContent = role;
  roleBadge.dataset.role = role;

  if (role === 'admin') {
    permissionLine.textContent =
      'Роль admin: просмотр каталога, создание, изменение, удаление и доступ к admin-маршруту.';
  } else if (role === 'seller') {
    permissionLine.textContent =
      'Роль seller: просмотр каталога, создание и изменение товаров. Admin-маршрут недоступен.';
  } else {
    permissionLine.textContent =
      'Роль user: доступен только просмотр каталога. Любые изменения товаров запрещены.';
  }

  createBtn.disabled = role === 'user';
  updateBtn.disabled = role === 'user';
  deleteBtn.disabled = role !== 'admin';
  actionHint.textContent = role === 'admin'
    ? 'У вас полный доступ.'
    : role === 'seller'
      ? 'Вы можете создавать и изменять товары.'
      : 'Для роли user кнопки изменения заблокированы.';
}

async function loadMe() {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!accessToken || !refreshToken) {
    window.location.href = '/';
    return false;
  }

  const { response, data } = await authRequest('/api/auth/me');

  if (!response.ok) {
    clearTokens();
    window.location.href = '/';
    return false;
  }

  currentUser = data;
  userLine.textContent = `Вход выполнен: ${data.first_name} ${data.last_name} (${data.email})`;
  updateRoleUI();
  return true;
}

async function loadProducts() {
  status.textContent = 'Загрузка...';
  const { response, data } = await authRequest('/api/products');

  if (!response.ok || !Array.isArray(data)) {
    productList.innerHTML = '';
    status.textContent = 'Не удалось загрузить каталог.';
    return;
  }

  productsCache = data;
  productList.innerHTML = data.map(productCard).join('');
  status.textContent = `Показано товаров: ${data.length}`;
}

async function checkRoute(path) {
  const { response, data } = await authRequest(path);
  accessResult.textContent = JSON.stringify(
    {
      status: response.status,
      body: data,
    },
    null,
    2
  );
}

function buildDemoProduct() {
  const stamp = new Date().toLocaleTimeString('ru-RU');
  return {
    title: `Demo ${currentUser.role} ${stamp}`,
    category: 'Accessory',
    description: `Тестовый товар, созданный ролью ${currentUser.role}`,
    price: currentUser.role === 'admin' ? 140 : 110,
  };
}

async function createProduct() {
  if (createBtn.disabled) {
    return;
  }

  const { response, data } = await authRequest('/api/products', {
    method: 'POST',
    body: JSON.stringify(buildDemoProduct()),
  });

  if (response.ok) {
    actionHint.textContent = `Товар создан: ${data.title}`;
    await loadProducts();
    return;
  }

  actionHint.textContent = `Создание не выполнено: ${data?.error || response.status}`;
}

async function updateLastProduct() {
  if (updateBtn.disabled || productsCache.length === 0) {
    return;
  }

  const lastProduct = productsCache[productsCache.length - 1];
  const { response, data } = await authRequest(`/api/products/${lastProduct.id}`, {
    method: 'PUT',
    body: JSON.stringify({
      description: `Обновлено ролью ${currentUser.role}`,
      price: Number(lastProduct.price) + 5,
    }),
  });

  if (response.ok) {
    actionHint.textContent = `Товар обновлен: ${data.title}`;
    await loadProducts();
    return;
  }

  actionHint.textContent = `Изменение не выполнено: ${data?.error || response.status}`;
}

async function deleteLastProduct() {
  if (deleteBtn.disabled || productsCache.length === 0) {
    return;
  }

  const lastProduct = productsCache[productsCache.length - 1];
  const { response, data } = await authRequest(`/api/products/${lastProduct.id}`, {
    method: 'DELETE',
  });

  if (response.ok) {
    actionHint.textContent = `Товар удален: ${lastProduct.title}`;
    await loadProducts();
    return;
  }

  actionHint.textContent = `Удаление не выполнено: ${data?.error || response.status}`;
}

reloadBtn.addEventListener('click', loadProducts);
logoutBtn.addEventListener('click', () => {
  clearTokens();
  window.location.href = '/';
});
checkRoleBtn.addEventListener('click', () => checkRoute('/api/products/role'));
checkAdminBtn.addEventListener('click', () => checkRoute('/api/products/admin/role'));
createBtn.addEventListener('click', createProduct);
updateBtn.addEventListener('click', updateLastProduct);
deleteBtn.addEventListener('click', deleteLastProduct);

(async () => {
  const ok = await loadMe();
  if (!ok) {
    return;
  }

  await loadProducts();
})();
