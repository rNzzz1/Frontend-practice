const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let body = null;

  try {
    body = text ? JSON.parse(text) : null;
  } catch (_error) {
    body = text;
  }

  return { status: response.status, body };
}

async function registerUser(email, role) {
  return request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email,
      first_name: role,
      last_name: 'test',
      password: 'qwerty123',
      role,
    }),
  });
}

async function login(email) {
  return request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password: 'qwerty123',
    }),
  });
}

async function main() {
  const userEmail = `user_${Date.now()}@example.com`;
  const sellerEmail = `seller_${Date.now()}@example.com`;
  const adminEmail = `admin_${Date.now()}@example.com`;

  const userRegister = await registerUser(userEmail, 'user');
  assert(userRegister.status === 201, `user register status ${userRegister.status}`);

  const sellerRegister = await registerUser(sellerEmail, 'seller');
  assert(sellerRegister.status === 201, `seller register status ${sellerRegister.status}`);

  const adminRegister = await registerUser(adminEmail, 'admin');
  assert(adminRegister.status === 201, `admin register status ${adminRegister.status}`);

  const invalidRole = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: `bad_${Date.now()}@example.com`,
      first_name: 'bad',
      last_name: 'role',
      password: 'qwerty123',
      role: 'manager',
    }),
  });
  assert(invalidRole.status === 400, `invalid role status ${invalidRole.status}`);

  const userLogin = await login(userEmail);
  assert(userLogin.status === 200, `user login status ${userLogin.status}`);
  assert(typeof userLogin.body.accessToken === 'string', 'user access token missing');
  assert(typeof userLogin.body.refreshToken === 'string', 'user refresh token missing');

  const sellerLogin = await login(sellerEmail);
  assert(sellerLogin.status === 200, `seller login status ${sellerLogin.status}`);

  const adminLogin = await login(adminEmail);
  assert(adminLogin.status === 200, `admin login status ${adminLogin.status}`);

  const userToken = userLogin.body.accessToken;
  const sellerToken = sellerLogin.body.accessToken;
  const adminToken = adminLogin.body.accessToken;
  const sellerRefreshToken = sellerLogin.body.refreshToken;

  const me = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(me.status === 200, `/api/auth/me status ${me.status}`);
  assert(me.body.role === 'seller', `expected seller role, got ${me.body.role}`);

  const blockedProducts = await request('/api/products');
  assert(blockedProducts.status === 401, `products without token status ${blockedProducts.status}`);

  const userList = await request('/api/products', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(userList.status === 200, `user products status ${userList.status}`);
  assert(Array.isArray(userList.body), 'products list must be array');

  const userRoleRoute = await request('/api/products/role', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(userRoleRoute.status === 403, `user role route status ${userRoleRoute.status}`);

  const sellerRoleRoute = await request('/api/products/role', {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(sellerRoleRoute.status === 200, `seller role route status ${sellerRoleRoute.status}`);

  const sellerAdminRoute = await request('/api/products/admin/role', {
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(sellerAdminRoute.status === 403, `seller admin route status ${sellerAdminRoute.status}`);

  const adminRoleRoute = await request('/api/products/admin/role', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminRoleRoute.status === 200, `admin role route status ${adminRoleRoute.status}`);

  const sellerCreate = await request('/api/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      title: 'Seller Product',
      category: 'Mouse',
      description: 'Created by seller',
      price: 99,
    }),
  });
  assert(sellerCreate.status === 201, `seller create status ${sellerCreate.status}`);
  const createdId = sellerCreate.body.id;

  const userCreate = await request('/api/products', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({
      title: 'User Product',
      category: 'Mouse',
      description: 'Created by user',
      price: 99,
    }),
  });
  assert(userCreate.status === 403, `user create status ${userCreate.status}`);

  const sellerUpdate = await request(`/api/products/${createdId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${sellerToken}` },
    body: JSON.stringify({
      price: 105,
    }),
  });
  assert(sellerUpdate.status === 200, `seller update status ${sellerUpdate.status}`);
  assert(sellerUpdate.body.price === 105, `updated price ${sellerUpdate.body.price}`);

  const sellerDelete = await request(`/api/products/${createdId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${sellerToken}` },
  });
  assert(sellerDelete.status === 403, `seller delete status ${sellerDelete.status}`);

  const adminDelete = await request(`/api/products/${createdId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(adminDelete.status === 200, `admin delete status ${adminDelete.status}`);
  assert(adminDelete.body.deleted === true, 'admin delete failed');

  const refreshWithoutHeader = await request('/api/auth/refresh', { method: 'POST' });
  assert(refreshWithoutHeader.status === 400, `refresh without header ${refreshWithoutHeader.status}`);

  const rotated = await request('/api/auth/refresh', {
    method: 'POST',
    headers: { 'x-refresh-token': sellerRefreshToken },
  });
  assert(rotated.status === 200, `refresh status ${rotated.status}`);
  assert(typeof rotated.body.accessToken === 'string', 'rotated access token missing');
  assert(typeof rotated.body.refreshToken === 'string', 'rotated refresh token missing');
  assert(rotated.body.refreshToken !== sellerRefreshToken, 'refresh token was not rotated');

  const oldRefreshBlocked = await request('/api/auth/refresh', {
    method: 'POST',
    headers: { 'x-refresh-token': sellerRefreshToken },
  });
  assert(oldRefreshBlocked.status === 401, `old refresh token status ${oldRefreshBlocked.status}`);

  const refreshedMe = await request('/api/auth/me', {
    headers: { Authorization: `Bearer ${rotated.body.accessToken}` },
  });
  assert(refreshedMe.status === 200, `me after refresh status ${refreshedMe.status}`);

  console.log('task11 smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
