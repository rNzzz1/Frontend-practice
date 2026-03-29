const assert = require('assert');

const BASE_URL = 'http://localhost:3000';

async function get(pathname) {
  const response = await fetch(`${BASE_URL}${pathname}`);
  const text = await response.text();

  return {
    status: response.status,
    text,
    headers: Object.fromEntries(response.headers.entries()),
  };
}

async function main() {
  const index = await get('/');
  assert(index.status === 200, `index status ${index.status}`);
  assert(index.text.includes('Offline Notes Board'), 'index content mismatch');

  const styles = await get('/styles.css');
  assert(styles.status === 200, `styles status ${styles.status}`);

  const app = await get('/app.js');
  assert(app.status === 200, `app.js status ${app.status}`);
  assert(app.text.includes('serviceWorker'), 'service worker registration missing');

  const sw = await get('/sw.js');
  assert(sw.status === 200, `sw.js status ${sw.status}`);
  assert(sw.text.includes('CACHE_NAME'), 'sw.js content mismatch');

  const offline = await get('/offline.html');
  assert(offline.status === 200, `offline.html status ${offline.status}`);

  console.log('task13 smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
