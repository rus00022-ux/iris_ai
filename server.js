const http = require('http');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const options = { host: process.env.HOST || '0.0.0.0', port: parseInt(process.env.PORT || '8000', 10) };

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];
  if (arg === '--host' && args[i + 1]) {
    options.host = args[i + 1];
    i += 1;
  } else if ((arg === '--port' || arg === '-p') && args[i + 1]) {
    options.port = parseInt(args[i + 1], 10) || options.port;
    i += 1;
  }
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.ogg': 'video/ogg',
  '.wav': 'audio/wav',
};

const PUBLIC_DIR = path.join(__dirname);

function resolvePath(urlPath) {
  if (!urlPath || urlPath === '/') {
    return path.join(PUBLIC_DIR, 'interactive.html');
  }

  const cleanPath = decodeURIComponent(urlPath.split('?')[0]);
  const requested = path.join(PUBLIC_DIR, cleanPath.replace(/^\/+/, ''));

  if (!requested.startsWith(PUBLIC_DIR)) {
    return null;
  }

  return requested;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404: Файл не найден');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500: Внутренняя ошибка сервера');
      }
      return;
    }

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const filePath = resolvePath(req.url);

  if (!filePath) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403: Доступ запрещён');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404: Файл не найден');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500: Внутренняя ошибка сервера');
      }
      return;
    }

    if (stats.isDirectory()) {
      const indexPath = path.join(filePath, 'index.html');
      fs.stat(indexPath, (indexErr, indexStats) => {
        if (indexErr || !indexStats.isFile()) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('403: Просмотр директорий запрещён');
          return;
        }

        sendFile(res, indexPath);
      });
      return;
    }

    sendFile(res, filePath);
  });
});

server.listen(options.port, options.host, () => {
  console.log(`Сервер запущен: http://${options.host}:${options.port}`);
  console.log('Откройте interactive.html или admin.html в браузере.');
});
