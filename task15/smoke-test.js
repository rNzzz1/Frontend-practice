const assert = require('assert');
const https = require('https');

const PORT = Number(process.env.PORT) || 3015;

function request(pathname) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: pathname,
        method: 'GET',
        rejectUnauthorized: false,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode || 0,
            body: Buffer.concat(chunks).toString('utf8'),
            headers: res.headers,
          });
        });
      }
    );

    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const index = await request('/');
  assert(index.status === 200, `index status ${index.status}`);
  assert(index.body.includes('Secure Notes Shell'), 'index content mismatch');

  const home = await request('/content/home.html');
  assert(home.status === 200, `home content status ${home.status}`);
  assert(home.body.includes('Заметки'), 'home content mismatch');

  const about = await request('/content/about.html');
  assert(about.status === 200, `about content status ${about.status}`);
  assert(about.body.includes('О нас'), 'about content mismatch');

  const app = await request('/app.js');
  assert(app.status === 200, `app.js status ${app.status}`);
  assert(app.body.includes('loadRoute'), 'app.js route logic missing');

  const sw = await request('/sw.js');
  assert(sw.status === 200, `sw.js status ${sw.status}`);
  assert(sw.body.includes('networkFirst'), 'sw.js strategy missing');

  const manifest = await request('/manifest.json');
  assert(manifest.status === 200, `manifest status ${manifest.status}`);
  assert(manifest.body.includes('"display": "standalone"'), 'manifest mismatch');

  const certResponse = await request('/icons/icon-192.png');
  assert(certResponse.status === 200, `icon status ${certResponse.status}`);

  console.log('task15 smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
