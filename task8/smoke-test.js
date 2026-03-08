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
        email: 'user2@example.com',
        first_name: 'Petr',
        last_name: 'Ivanov',
        password: 'qwerty123',
      }),
    });
    assert(register.status === 201, `register status ${register.status}`);

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user2@example.com', password: 'qwerty123' }),
    });
    assert(login.status === 200, `login status ${login.status}`);
    assert(login.body && typeof login.body.accessToken === 'string', 'token missing');

    const token = login.body.accessToken;

    const me = await request('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(me.status === 200, `me status ${me.status}`);
    assert(me.body && me.body.email === 'user2@example.com', 'me body invalid');

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
      headers: { Authorization: `Bearer ${token}` },
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
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(allowedList.status === 200, `protected list with token status ${allowedList.status}`);

    const blockedGet = await request(`/api/products/${productId}`);
    assert(blockedGet.status === 401, `protected get without token status ${blockedGet.status}`);

    const allowedGet = await request(`/api/products/${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(allowedGet.status === 200, `protected get with token status ${allowedGet.status}`);

    const updated = await request(`/api/products/${productId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ price: 3000 }),
    });
    assert(updated.status === 200, `protected put status ${updated.status}`);
    assert(updated.body && updated.body.price === 3000, 'protected put body invalid');

    const deleted = await request(`/api/products/${productId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    assert(deleted.status === 200, `protected delete status ${deleted.status}`);
    assert(deleted.body && deleted.body.deleted === true, 'protected delete body invalid');

    console.log('task8 smoke test passed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
