const assert = require('assert');

const PORT = Number(process.env.PORT) || 3000;
const BASE_URL = `http://localhost:${PORT}`;

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

  const manifest = await get('/manifest.json');
  assert(manifest.status === 200, `manifest status ${manifest.status}`);
  assert(manifest.text.includes('"display": "standalone"'), 'manifest display mismatch');

  const icon192 = await get('/icons/icon-192.png');
  assert(icon192.status === 200, `icon192 status ${icon192.status}`);

  const icon512 = await get('/icons/icon-512.png');
  assert(icon512.status === 200, `icon512 status ${icon512.status}`);

  console.log('task14 smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
