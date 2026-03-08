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
        email: 'user1@example.com',
        first_name: 'Ivan',
        last_name: 'Petrov',
        password: 'qwerty123',
      }),
    });
    assert(register.status === 201, `register status ${register.status}`);

    const login = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user1@example.com', password: 'qwerty123' }),
    });
    assert(login.status === 200, `login status ${login.status}`);
    assert(login.body && login.body.login === true, 'login body invalid');

    const created = await request('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        title: 'Keyboard',
        category: 'Peripherals',
        description: 'Mechanical keyboard',
        price: 4500,
      }),
    });
    assert(created.status === 201, `create product status ${created.status}`);
    assert(created.body && created.body.id, 'product id missing');

    const productId = created.body.id;

    const list = await request('/api/products');
    assert(list.status === 200, `list status ${list.status}`);
    assert(Array.isArray(list.body), 'list body is not array');

    const getById = await request(`/api/products/${productId}`);
    assert(getById.status === 200, `get by id status ${getById.status}`);

    const updated = await request(`/api/products/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ price: 5000 }),
    });
    assert(updated.status === 200, `put status ${updated.status}`);
    assert(updated.body && updated.body.price === 5000, 'put body invalid');

    const deleted = await request(`/api/products/${productId}`, { method: 'DELETE' });
    assert(deleted.status === 200, `delete status ${deleted.status}`);
    assert(deleted.body && deleted.body.deleted === true, 'delete body invalid');

    console.log('task7 smoke test passed');
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
