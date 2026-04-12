const https = require('https');
const fs = require('fs');
const path = require('path');
const { Server } = require('socket.io');

const PORT = Number(process.env.PORT) || 3016;
const PUBLIC_DIR = path.join(__dirname, 'public');
const CERT_PATH = path.join(__dirname, 'certs', 'localhost-cert.pem');
const KEY_PATH = path.join(__dirname, 'certs', 'localhost-key.pem');

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

if (!fs.existsSync(CERT_PATH) || !fs.existsSync(KEY_PATH)) {
  console.error('HTTPS certificate files not found in /certs.');
  process.exit(1);
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

const server = https.createServer(
  {
    key: fs.readFileSync(KEY_PATH),
    cert: fs.readFileSync(CERT_PATH),
  },
  (req, res) => {
    const url = new URL(req.url || '/', `https://${req.headers.host || 'localhost'}`);

    if (url.pathname.startsWith('/socket.io/')) {
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
);

const io = new Server(server);

io.on('connection', (socket) => {
  socket.on('note-created', (payload = {}) => {
    const outgoing = {
      senderId: payload.senderId || null,
      title: payload.title || 'Без названия',
      message: payload.message || 'Добавлена новая заметка.',
      createdAt: Date.now(),
    };

    socket.broadcast.emit('note-created', outgoing);
  });
});

server.listen(PORT, () => {
  console.log(`Task16 HTTPS server started at https://localhost:${PORT}`);
});
