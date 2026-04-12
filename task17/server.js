const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');
const webpush = require('web-push');

const PORT = Number(process.env.PORT) || 3017;
const PUBLIC_DIR = path.join(__dirname, 'public');
const CERT_PATH = path.join(__dirname, 'certs', 'localhost-cert.pem');
const KEY_PATH = path.join(__dirname, 'certs', 'localhost-key.pem');
const PROTOCOL = (process.env.PROTOCOL || 'http').toLowerCase();
const USE_HTTPS = PROTOCOL === 'https';
const VAPID_KEYS_PATH = path.join(__dirname, 'vapid-keys.json');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

if (USE_HTTPS && (!fs.existsSync(CERT_PATH) || !fs.existsSync(KEY_PATH))) {
  console.error('HTTPS certificate files not found in /certs.');
  process.exit(1);
}

function isValidVapidKeys(keys) {
  return Boolean(
    keys &&
      typeof keys.publicKey === 'string' &&
      keys.publicKey.length > 20 &&
      typeof keys.privateKey === 'string' &&
      keys.privateKey.length > 20
  );
}

function loadOrCreateVapidKeys() {
  const envKeys = {
    publicKey: process.env.VAPID_PUBLIC_KEY || '',
    privateKey: process.env.VAPID_PRIVATE_KEY || '',
  };

  if (isValidVapidKeys(envKeys)) {
    console.log('Using VAPID keys from environment.');
    return envKeys;
  }

  if (fs.existsSync(VAPID_KEYS_PATH)) {
    try {
      const fileData = JSON.parse(fs.readFileSync(VAPID_KEYS_PATH, 'utf8'));
      if (isValidVapidKeys(fileData)) {
        console.log('Using VAPID keys from vapid-keys.json.');
        return fileData;
      }
    } catch (error) {
      console.warn('Unable to read existing vapid-keys.json:', error.message);
    }
  }

  const generated = webpush.generateVAPIDKeys();

  try {
    fs.writeFileSync(VAPID_KEYS_PATH, `${JSON.stringify(generated, null, 2)}\n`, 'utf8');
    console.log('Generated VAPID keys and saved to vapid-keys.json.');
  } catch (error) {
    console.warn('Failed to persist VAPID keys:', error.message);
  }

  return generated;
}

const vapidKeys = loadOrCreateVapidKeys();
webpush.setVapidDetails('mailto:practice17@example.com', vapidKeys.publicKey, vapidKeys.privateKey);

const subscriptions = new Map();
const reminders = new Map();
let io = null;

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function resolvePath(urlPath) {
  const normalizedPath = decodeURIComponent((urlPath || '/').split('?')[0]);
  const requestedPath = normalizedPath === '/' ? '/index.html' : normalizedPath;
  const safePath = path.normalize(requestedPath).replace(/^([.][.][/\\])+/, '');
  return path.join(PUBLIC_DIR, safePath);
}

function sendFile(filePath, res) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('File not found');
      return;
    }

    const extname = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': extname === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
  });
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';

    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1_000_000) {
        reject(new Error('Payload too large'));
      }
    });

    req.on('end', () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (_error) {
        reject(new Error('Invalid JSON'));
      }
    });

    req.on('error', (error) => {
      reject(error);
    });
  });
}

function getSubscriptionKey(subscription) {
  const endpoint = subscription && typeof subscription.endpoint === 'string' ? subscription.endpoint : '';
  const p256dh =
    subscription &&
    subscription.keys &&
    typeof subscription.keys.p256dh === 'string'
      ? subscription.keys.p256dh
      : '';

  return `${endpoint}|${p256dh}`;
}

async function sendPushToAll(payloadObject) {
  const payload = JSON.stringify(payloadObject);
  const entries = Array.from(subscriptions.entries());

  let sent = 0;
  let removed = 0;
  let failed = 0;

  await Promise.all(
    entries.map(async ([key, subscription]) => {
      try {
        await webpush.sendNotification(subscription, payload);
        sent += 1;
      } catch (error) {
        if (error && (error.statusCode === 404 || error.statusCode === 410)) {
          subscriptions.delete(key);
          removed += 1;
        } else {
          failed += 1;
          console.error('Push error:', error && error.message ? error.message : error);
        }
      }
    })
  );

  return {
    targeted: entries.length,
    sent,
    removed,
    failed,
  };
}

function clearReminder(reminderId) {
  if (!reminders.has(reminderId)) {
    return;
  }

  clearTimeout(reminders.get(reminderId).timeoutId);
  reminders.delete(reminderId);
}

function parseReminderPayload(payload = {}) {
  const reminderId = payload.id ? String(payload.id).trim() : '';
  const text = typeof payload.text === 'string' ? payload.text.trim() : '';
  const reminderTime = Number(payload.reminderTime);

  if (!reminderId || !text || !Number.isFinite(reminderTime)) {
    return { ok: false, error: 'Invalid reminder payload' };
  }

  if (reminderTime <= Date.now()) {
    return { ok: false, error: 'Reminder time must be in the future' };
  }

  return {
    ok: true,
    reminderId,
    text,
    reminderTime,
  };
}

function scheduleReminder(reminderId, text, reminderTime, title = 'Напоминание') {
  clearReminder(reminderId);

  const delay = reminderTime - Date.now();
  if (delay <= 0) {
    return false;
  }

  const timeoutId = setTimeout(async () => {
    await sendPushToAll({
      title,
      body: text,
      reminderId,
    });

    reminders.delete(reminderId);
  }, delay);

  reminders.set(reminderId, {
    timeoutId,
    text,
    reminderTime,
  });

  return true;
}

async function requestHandler(req, res) {
  const baseProtocol = USE_HTTPS ? 'https' : 'http';
  const url = new URL(req.url || '/', `${baseProtocol}://${req.headers.host || 'localhost'}`);

    if (url.pathname.startsWith('/socket.io/')) {
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/push/public-key') {
      sendJson(res, 200, { publicKey: vapidKeys.publicKey });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/push/subscribe') {
      try {
        const body = await readJson(req);
        const subscription = body && body.subscription ? body.subscription : null;
        const subscriptionKey = subscription ? getSubscriptionKey(subscription) : '';

        if (!subscription || !subscription.endpoint || !subscriptionKey) {
          sendJson(res, 400, { error: 'Invalid subscription' });
          return;
        }

        subscriptions.set(subscriptionKey, subscription);
        sendJson(res, 200, { ok: true, totalSubscriptions: subscriptions.size });
      } catch (error) {
        sendJson(res, 400, { error: error.message || 'Invalid request' });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/push/unsubscribe') {
      try {
        const body = await readJson(req);
        const subscription = body && body.subscription ? body.subscription : null;
        const subscriptionKey = subscription ? getSubscriptionKey(subscription) : '';

        if (!subscription || !subscriptionKey) {
          sendJson(res, 400, { error: 'Invalid subscription' });
          return;
        }

        subscriptions.delete(subscriptionKey);
        sendJson(res, 200, { ok: true, totalSubscriptions: subscriptions.size });
      } catch (error) {
        sendJson(res, 400, { error: error.message || 'Invalid request' });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/push/test') {
      try {
        const body = await readJson(req);
        const title = typeof body.title === 'string' && body.title.trim() ? body.title.trim() : 'Тестовое уведомление';
        const message =
          typeof body.body === 'string' && body.body.trim()
            ? body.body.trim()
            : 'Если вы видите это сообщение, Push на вашем Mac работает.';

        const stats = await sendPushToAll({
          title,
          body: message,
          reminderId: null,
        });

        sendJson(res, 200, {
          ok: true,
          ...stats,
        });
      } catch (error) {
        sendJson(res, 400, { error: error.message || 'Invalid request' });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/reminders') {
      try {
        const body = await readJson(req);
        const parsed = parseReminderPayload(body);

        if (!parsed.ok) {
          sendJson(res, 400, { error: parsed.error });
          return;
        }

        const scheduled = scheduleReminder(parsed.reminderId, parsed.text, parsed.reminderTime, 'Напоминание');
        if (!scheduled) {
          sendJson(res, 400, { error: 'Reminder time must be in the future' });
          return;
        }

        if (io) {
          io.emit('reminder-planned', {
            id: parsed.reminderId,
            text: parsed.text,
            reminderTime: parsed.reminderTime,
          });
        }

        sendJson(res, 200, {
          ok: true,
          id: parsed.reminderId,
          reminderTime: parsed.reminderTime,
        });
      } catch (error) {
        sendJson(res, 400, { error: error.message || 'Invalid request' });
      }
      return;
    }

    if (req.method === 'POST' && url.pathname === '/snooze') {
      const reminderId = (url.searchParams.get('reminderId') || '').trim();

      if (!reminderId || !reminders.has(reminderId)) {
        sendJson(res, 404, { error: 'Reminder not found' });
        return;
      }

      const reminder = reminders.get(reminderId);
      const newReminderTime = Date.now() + 5 * 60 * 1000;

      const scheduled = scheduleReminder(reminderId, reminder.text, newReminderTime, 'Напоминание отложено');
      if (!scheduled) {
        sendJson(res, 500, { error: 'Unable to snooze reminder' });
        return;
      }

      sendJson(res, 200, {
        message: 'Reminder snoozed for 5 minutes',
        reminderId,
        reminderTime: newReminderTime,
      });
      return;
    }

    const filePath = resolvePath(url.pathname);
    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (error, stats) => {
      if (!error && stats.isFile()) {
        sendFile(filePath, res);
        return;
      }

      if (!error && stats.isDirectory()) {
        sendFile(path.join(filePath, 'index.html'), res);
        return;
      }

      sendFile(path.join(PUBLIC_DIR, 'index.html'), res);
    });
}

const server = USE_HTTPS
  ? https.createServer(
      {
        key: fs.readFileSync(KEY_PATH),
        cert: fs.readFileSync(CERT_PATH),
      },
      requestHandler
    )
  : http.createServer(requestHandler);

io = new Server(server);

io.on('connection', (socket) => {
  socket.on('newTask', (payload = {}) => {
    const text = typeof payload.text === 'string' ? payload.text.trim() : '';
    if (!text) {
      return;
    }

    socket.broadcast.emit('note-created', {
      text,
      createdAt: Date.now(),
    });
  });

  socket.on('newReminder', (payload = {}) => {
    const parsed = parseReminderPayload(payload);

    if (!parsed.ok) {
      socket.emit('reminder-error', { error: parsed.error });
      return;
    }

    const scheduled = scheduleReminder(parsed.reminderId, parsed.text, parsed.reminderTime, 'Напоминание');
    if (!scheduled) {
      socket.emit('reminder-error', { error: 'Reminder time must be in the future' });
      return;
    }

    socket.emit('reminder-accepted', {
      id: parsed.reminderId,
      reminderTime: parsed.reminderTime,
    });

    socket.broadcast.emit('reminder-planned', {
      id: parsed.reminderId,
      text: parsed.text,
      reminderTime: parsed.reminderTime,
    });
  });
});

server.listen(PORT, () => {
  const protocol = USE_HTTPS ? 'https' : 'http';
  console.log(`Task17 server started at ${protocol}://localhost:${PORT}`);
});
