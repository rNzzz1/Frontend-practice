const app = require('./server');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const server = app.listen(0);
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;

  async function request(path, options = {}) {
    const { headers: extraHeaders, ...restOptions } = options;
    const response = await fetch(base + path, {
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(extraHeaders || {}),
      },
    });

    let body = null;
    const text = await response.text();
    try {
      body = text ? JSON.parse(text) : null;
    } catch (_error) {
      body = text;
    }

    return { status: response.status, body };
  }

  try {
    const register = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: 'user9@example.com',
        first_name: 'Nikolay',
        last_name: 'Sidorov',
        password: 'qwerty123',
      }),
    });
    assert(register.status === 201, `register status ${register.status}`);

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user9@example.com', password: 'qwerty123' }),
    });
    assert(login.status === 200, `login status ${login.status}`);
    assert(login.body && typeof login.body.accessToken === 'string', 'access token missing');
    assert(login.body && typeof login.body.refreshToken === 'string', 'refresh token missing');

    const accessToken = login.body.accessToken;
    const refreshToken = login.body.refreshToken;

    const blockedRefresh = await request('/api/auth/refresh', { method: 'POST' });
    assert(blockedRefresh.status === 400, `refresh without header status ${blockedRefresh.status}`);

    const me = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    assert(me.status === 200, `me status ${me.status}`);
    assert(me.body && me.body.email === 'user9@example.com', 'me body invalid');

    const rotated = await request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'x-refresh-token': refreshToken },
    });
    assert(rotated.status === 200, `refresh status ${rotated.status}`);
    assert(rotated.body && typeof rotated.body.accessToken === 'string', 'new access token missing');
    assert(rotated.body && typeof rotated.body.refreshToken === 'string', 'new refresh token missing');
    assert(rotated.body.refreshToken !== refreshToken, 'refresh token was not rotated');

    const oldRefreshBlocked = await request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'x-refresh-token': refreshToken },
    });
    assert(oldRefreshBlocked.status === 401, `old refresh token status ${oldRefreshBlocked.status}`);

    const refreshedAccessToken = rotated.body.accessToken;
    const refreshedRefreshToken = rotated.body.refreshToken;

    const blockedCreate = await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Mouse',
        category: 'Peripherals',
        description: 'Wireless mouse',
        price: 2500,
      }),
    });
    assert(
      blockedCreate.status === 401,
      `protected create without token status ${blockedCreate.status}`
    );

    const created = await request('/api/products', {
      method: 'POST',
      headers: { Authorization: `Bearer ${refreshedAccessToken}` },
      body: JSON.stringify({
        title: 'Mouse',
        category: 'Peripherals',
        description: 'Wireless mouse',
        price: 2500,
      }),
    });
    assert(created.status === 201, `create product with token status ${created.status}`);
    assert(created.body && created.body.id, 'product id missing');

    const productId = created.body.id;

    const blockedList = await request('/api/products');
    assert(blockedList.status === 401, `protected list without token status ${blockedList.status}`);

    const allowedList = await request('/api/products', {
      headers: { Authorization: `Bearer ${refreshedAccessToken}` },
    });
    assert(allowedList.status === 200, `protected list with token status ${allowedList.status}`);

    const allowedGet = await request(`/api/products/${productId}`, {
      headers: { Authorization: `Bearer ${refreshedAccessToken}` },
    });
    assert(allowedGet.status === 200, `protected get with token status ${allowedGet.status}`);

    const updated = await request(`/api/products/${productId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${refreshedAccessToken}` },
      body: JSON.stringify({ price: 3000 }),
    });
    assert(updated.status === 200, `protected put status ${updated.status}`);
    assert(updated.body && updated.body.price === 3000, 'protected put body invalid');

    const deleted = await request(`/api/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${refreshedAccessToken}` },
    });
    assert(deleted.status === 200, `protected delete status ${deleted.status}`);
    assert(deleted.body && deleted.body.deleted === true, 'protected delete body invalid');

    const secondRotation = await request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'x-refresh-token': refreshedRefreshToken },
    });
    assert(secondRotation.status === 200, `second refresh status ${secondRotation.status}`);

    console.log('task9 smoke test passed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
