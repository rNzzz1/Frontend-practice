const assert = require('assert');
const http = require('http');
const https = require('https');

const PORT = Number(process.env.PORT) || 3017;
const PROTOCOL = (process.env.PROTOCOL || 'http').toLowerCase();
const client = PROTOCOL === 'https' ? https : http;

function request(pathname, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;

    const req = client.request(
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
  assert.strictEqual(index.status, 200, `index status ${index.status}`);
  assert(index.body.includes('Практика 17'), 'index content mismatch');

  const home = await request('/content/home.html');
  assert.strictEqual(home.status, 200, `home status ${home.status}`);
  assert(home.body.includes('reminder-form'), 'reminder form missing');
  assert(home.body.includes('testPushBtn'), 'test push button missing');

  const app = await request('/app.js');
  assert.strictEqual(app.status, 200, `app.js status ${app.status}`);
  assert(app.body.includes('sendTestPush'), 'test push logic missing in app.js');
  assert(app.body.includes('scheduleReminderOnServer'), 'server reminder scheduling missing in app.js');

  const sw = await request('/sw.js');
  assert.strictEqual(sw.status, 200, `sw.js status ${sw.status}`);
  assert(sw.body.includes('notificationclick'), 'notification click handler missing in sw.js');

  const publicKey = await request('/api/push/public-key');
  assert.strictEqual(publicKey.status, 200, `public key status ${publicKey.status}`);
  const publicKeyPayload = JSON.parse(publicKey.body);
  assert(publicKeyPayload.publicKey, 'public key missing');

  const pushTest = await request('/api/push/test', 'POST', { title: 'smoke', body: 'ok' });
  assert.strictEqual(pushTest.status, 200, `push test status ${pushTest.status}`);
  const pushTestPayload = JSON.parse(pushTest.body);
  assert.strictEqual(pushTestPayload.ok, true, 'push test payload mismatch');

  const reminderInvalid = await request('/api/reminders', 'POST', { id: 'x', text: 'test', reminderTime: Date.now() - 1000 });
  assert.strictEqual(reminderInvalid.status, 400, `invalid reminder status ${reminderInvalid.status}`);

  const reminderValid = await request('/api/reminders', 'POST', {
    id: 'smoke-reminder',
    text: 'smoke reminder',
    reminderTime: Date.now() + 10_000,
  });
  assert.strictEqual(reminderValid.status, 200, `valid reminder status ${reminderValid.status}`);

  const snooze = await request('/snooze?reminderId=smoke-reminder', 'POST');
  assert.strictEqual(snooze.status, 200, `snooze status ${snooze.status}`);

  console.log('task17 smoke test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
