require('dotenv').config();
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const incomes = require('./api/incomes');
const fixedExpenses = require('./api/fixed-expenses');
const dailyExpenses = require('./api/daily-expenses');
const creditCardSpendings = require('./api/credit-card-spendings');
const month = require('./api/month');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const apiRoutes = {
  '/api/incomes': incomes,
  '/api/fixed-expenses': fixedExpenses,
  '/api/daily-expenses': dailyExpenses,
  '/api/credit-card-spendings': creditCardSpendings,
  '/api/month': month,
};

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.normalize(filePath).replace(/^(\.\.[/\\])+/, '');
  const abs = path.join(PUBLIC_DIR, filePath);

  if (!abs.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(abs, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end('Not found');
    }
    const ext = path.extname(abs).toLowerCase();
    res.writeHead(200, { 'Content-Type': mime[ext] || 'application/octet-stream' });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const handler = apiRoutes[url.pathname];
    if (handler) {
      // Preserve query string for handlers that read req.url
      req.url = url.pathname + url.search;
      return handler(req, res);
    }
    return serveStatic(req, res, url.pathname);
  } catch (err) {
    console.error(err);
    res.writeHead(500);
    res.end('Server error');
  }
});

server.listen(PORT, () => {
  console.log(`MyFinance running at http://localhost:${PORT}`);
  if (!process.env.DATABASE_URL) {
    console.warn('Warning: DATABASE_URL is not set');
  }
});
