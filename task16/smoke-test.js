const assert = require('assert');
const https = require('https');

const PORT = Number(process.env.PORT) || 3016;

function request(pathname, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const req = https.request(
      {
        hostname: 'localhost',
        port: PORT,
        path: pathname,
        method,
        rejectUnauthorized: false,
        headers: payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : undefined,
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
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

async function main() {
  const index = await request('/');
  assert(index.status === 200, `index status ${index.status}`);
  assert(index.body.includes('Realtime Notes'), 'index content mismatch');

  const home = await request('/content/home.html');
  assert(home.status === 200, `home status ${home.status}`);

  const about = await request('/content/about.html');
  assert(about.status === 200, `about status ${about.status}`);

  const app = await request('/app.js');
  assert(app.status === 200, `app.js status ${app.status}`);
  assert(app.body.includes('enableNotifications'), 'notification logic missing in app.js');

  const socketScript = await request('/socket.io/socket.io.js');
  assert(socketScript.status === 200, `socket script status ${socketScript.status}`);
  assert(socketScript.body.includes('io'), 'socket script mismatch');

  const manifest = await request('/manifest.json');
  assert(manifest.status === 200, `manifest status ${manifest.status}`);
  assert(manifest.body.includes('\"display\": \"standalone\"'), 'manifest mismatch');

  console.log('task16 smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
