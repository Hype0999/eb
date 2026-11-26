import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const DB_PATH = path.join(DATA_DIR, 'reviews.sqlite');

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';

fs.mkdirSync(DATA_DIR, { recursive: true });

const sqlite = new DatabaseSync(DB_PATH);
sqlite.exec(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS reviews (
    reviewId TEXT PRIMARY KEY,
    submissionDate TEXT NOT NULL,
    submissionTime TEXT NOT NULL,
    createdAtIso TEXT NOT NULL,
    starRating INTEGER NOT NULL CHECK(starRating BETWEEN 1 AND 5),
    selectedReactions TEXT NOT NULL,
    suggestions TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_reviews_created ON reviews(createdAtIso DESC);
`);

const insertStmt = sqlite.prepare(`
  INSERT OR IGNORE INTO reviews (
    reviewId, submissionDate, submissionTime, createdAtIso,
    starRating, selectedReactions, suggestions
  ) VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const selectAllStmt = sqlite.prepare(`
  SELECT reviewId, submissionDate, submissionTime, createdAtIso,
         starRating, selectedReactions, suggestions
  FROM reviews
  ORDER BY createdAtIso DESC
`);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(payload));
}

function readJsonBody(req, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error('Payload too large'));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('Invalid JSON payload'));
      }
    });
    req.on('error', reject);
  });
}

function normalizeReview(input) {
  const star = Number(input?.starRating);
  if (!Number.isInteger(star) || star < 1 || star > 5) {
    return null;
  }
  const reviewId = String(input?.reviewId || '').trim();
  if (!reviewId || reviewId.length > 80) {
    return null;
  }
  const reactions = Array.isArray(input?.selectedReactions)
    ? input.selectedReactions.map((r) => String(r).trim()).filter(Boolean)
    : [];

  return {
    reviewId,
    submissionDate: String(input?.submissionDate || '').slice(0, 20),
    submissionTime: String(input?.submissionTime || '').slice(0, 20),
    createdAtIso: String(input?.createdAtIso || new Date().toISOString()).slice(0, 40),
    starRating: star,
    selectedReactions: reactions,
    suggestions: String(input?.suggestions || '').slice(0, 2000),
  };
}

function formatRow(row) {
  let parsedReactions = [];
  try {
    parsedReactions = JSON.parse(row.selectedReactions);
  } catch {
    parsedReactions = [];
  }
  return {
    reviewId: row.reviewId,
    submissionDate: row.submissionDate,
    submissionTime: row.submissionTime,
    createdAtIso: row.createdAtIso,
    starRating: row.starRating,
    selectedReactions: Array.isArray(parsedReactions) ? parsedReactions : [],
    suggestions: row.suggestions || '',
    synced: 1,
  };
}

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mime = MIME_TYPES[ext] || 'application/octet-stream';
  const isAsset = filePath.includes(`${path.sep}assets${path.sep}`);
  const data = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': mime,
    'Content-Length': data.byteLength,
    'Cache-Control': isAsset ? 'public, max-age=31536000, immutable' : 'no-store, must-revalidate',
  });
  res.end(data);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  try {
    if (pathname === '/api/health' && req.method === 'GET') {
      return sendJson(res, 200, { ok: true, database: 'sqlite', path: DB_PATH });
    }

    if (pathname === '/api/reviews' && req.method === 'GET') {
      const rows = selectAllStmt.all().map(formatRow);
      return sendJson(res, 200, { reviews: rows });
    }

    if (pathname === '/api/reviews' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const record = normalizeReview(body);
      if (!record) {
        return sendJson(res, 400, { error: 'Invalid review payload' });
      }
      insertStmt.run(
        record.reviewId,
        record.submissionDate,
        record.submissionTime,
        record.createdAtIso,
        record.starRating,
        JSON.stringify(record.selectedReactions),
        record.suggestions
      );
      return sendJson(res, 201, { ok: true, review: { ...record, synced: 1 } });
    }

    if (pathname === '/api/reviews/restore' && req.method === 'POST') {
      const body = await readJsonBody(req);
      const list = Array.isArray(body?.reviews) ? body.reviews : [];
      let inserted = 0;
      sqlite.exec('BEGIN');
      try {
        for (const item of list) {
          const record = normalizeReview(item);
          if (!record) continue;
          const info = insertStmt.run(
            record.reviewId,
            record.submissionDate,
            record.submissionTime,
            record.createdAtIso,
            record.starRating,
            JSON.stringify(record.selectedReactions),
            record.suggestions
          );
          if (info.changes > 0) inserted += 1;
        }
        sqlite.exec('COMMIT');
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
      return sendJson(res, 200, { ok: true, inserted });
    }

    if (pathname.startsWith('/api/')) {
      return sendJson(res, 404, { error: 'API endpoint not found' });
    }

    if (!fs.existsSync(DIST_DIR)) {
      res.writeHead(503, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Frontend build not found. Run "npm run build" first.');
      return;
    }

    const safeRelPath = path.normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
    const isRoot = safeRelPath === '/' || safeRelPath === '\\' || safeRelPath === '.';
    let candidate = path.join(DIST_DIR, isRoot ? 'index.html' : safeRelPath);

    if (!candidate.startsWith(DIST_DIR)) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    const exists = fs.existsSync(candidate) && !fs.statSync(candidate).isDirectory();
    if (!exists) {
      // Never return index.html for missing JS/CSS/image assets
      if (pathname.startsWith('/assets/') || /\.[a-z0-9]{2,6}$/i.test(pathname)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      candidate = path.join(DIST_DIR, 'index.html');
    }

    serveStaticFile(res, candidate);
  } catch (err) {
    console.error('[Server Error]', err);
    sendJson(res, 500, { error: err instanceof Error ? err.message : 'Internal server error' });
  }
});

function getLocalNetworkUrls(port) {
  const urls = [];
  const interfaces = os.networkInterfaces();
  for (const entries of Object.values(interfaces)) {
    if (!entries) continue;
    for (const entry of entries) {
      if (entry.family === 'IPv4' && !entry.internal) {
        urls.push(`http://${entry.address}:${port}`);
      }
    }
  }
  return urls;
}

// Prevent keep-alive race conditions with reverse proxies like ngrok
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;

server.listen(PORT, HOST, () => {
  console.log('\n  GAU SAMVARDHAN — Exhibition Feedback Server');
  console.log(`  SQLite Database : ${DB_PATH}`);
  console.log(`  Local Laptop    : http://localhost:${PORT}`);
  const lanUrls = getLocalNetworkUrls(PORT);
  for (const url of lanUrls) {
    console.log(`  Wi-Fi Network   : ${url}`);
  }
  console.log(`  Admin Dashboard : http://localhost:${PORT}/admin\n`);
});
