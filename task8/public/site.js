const TOKEN_KEY = 'task8_access_token';

const productList = document.getElementById('productList');
const status = document.getElementById('status');
const userLine = document.getElementById('userLine');
const reloadBtn = document.getElementById('reloadBtn');
const logoutBtn = document.getElementById('logoutBtn');

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
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
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
        <h2 class="product-title">${escapeHtml(product.title)}</h2>
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
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  return { response, data };
}

async function loadMe() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) {
    window.location.href = '/';
    return;
  }

  const { response, data } = await request('/api/auth/me', {
    headers: authHeaders(),
  });

  if (!response.ok) {
    localStorage.removeItem(TOKEN_KEY);
    window.location.href = '/';
    return;
  }

  userLine.textContent = `Вход выполнен: ${data.first_name} ${data.last_name} (${data.email})`;
}

async function loadProducts() {
  status.textContent = 'Загрузка...';
  const { response, data } = await request('/api/products', {
    headers: authHeaders(),
  });
  if (!response.ok || !Array.isArray(data)) {
    productList.innerHTML = '';
    status.textContent = 'Ошибка загрузки списка товаров.';
    return;
  }

  productList.innerHTML = data.map(productCard).join('');
  status.textContent = `Показано товаров: ${data.length}`;
}

reloadBtn.addEventListener('click', loadProducts);
logoutBtn.addEventListener('click', () => {
  localStorage.removeItem(TOKEN_KEY);
  window.location.href = '/';
});

(async () => {
  await loadMe();
  await loadProducts();
})();
