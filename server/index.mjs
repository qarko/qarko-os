import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDiscordNotifier } from './discordNotifier.mjs';
import { createWorkspaceStore } from './workspaceStore.mjs';

const rootDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const defaultDistDir = join(rootDir, 'dist');

const mimeTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
]);

const apiCorsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,OPTIONS',
  'access-control-allow-headers': 'accept,authorization,content-type,x-qarko-access-token',
};

const maxJsonBodyBytes = 64 * 1024;
const maxFeedbackEntries = 5;
const feedbackWindowMs = 60 * 1000;
const feedbackMaxPerWindow = 20;
const requireConfiguredAccessToken = process.env.NODE_ENV === 'production' || Boolean(process.env.RAILWAY_ENVIRONMENT);

const sendJson = (response, statusCode, body) => {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...apiCorsHeaders,
  });
  response.end(JSON.stringify(body));
};

const readJsonBody = async (request) => {
  const chunks = [];
  let totalBytes = 0;
  for await (const chunk of request) {
    totalBytes += chunk.length;
    if (totalBytes > maxJsonBodyBytes) {
      const error = new Error('Request body is too large.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
};

const readAccessToken = (request) => {
  const bearer = request.headers.authorization?.replace(/^Bearer\s+/i, '').trim();
  const headerToken = request.headers['x-qarko-access-token'];
  return typeof headerToken === 'string' && headerToken.trim() ? headerToken.trim() : bearer;
};

const isAuthorized = (request, accessToken) => {
  if (!accessToken) return !requireConfiguredAccessToken;
  const suppliedToken = readAccessToken(request);
  if (!suppliedToken) return false;
  const expected = Buffer.from(accessToken);
  const supplied = Buffer.from(suppliedToken);
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
};

const clientKeyFor = (request) => {
  const forwarded = request.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return request.socket.remoteAddress ?? 'unknown';
};

const consumeRateLimit = (buckets, key) => {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + feedbackWindowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= feedbackMaxPerWindow;
};

const truncateField = (value, maxLength) => String(value ?? '').trim().slice(0, maxLength);

const allowedAreas = new Set(['install', 'hermes', 'project', 'approval', 'sync', 'other']);
const allowedEase = new Set(['easy', 'confusing', 'blocked']);

const normalizeFeedbackEntry = (entry) => {
  if (!entry || typeof entry !== 'object') return null;
  const message = truncateField(entry.message, 2000);
  if (!message) return null;
  const area = allowedAreas.has(entry.area) ? entry.area : 'other';
  const ease = allowedEase.has(entry.ease) ? entry.ease : 'confusing';
  return {
    id: truncateField(entry.id || `feedback-${Date.now()}-${Math.random().toString(16).slice(2)}`, 120),
    area,
    ease,
    message,
    createdAt: truncateField(entry.createdAt || new Date().toISOString(), 120),
    testerName: truncateField(entry.testerName, 120),
    testerContact: truncateField(entry.testerContact, 160),
    appVersion: truncateField(entry.appVersion || '0.1.0', 40),
  };
};

const requireAccess = (request, response, accessToken) => {
  if (isAuthorized(request, accessToken)) return true;
  sendJson(response, 401, {
    ok: false,
    error: 'Admin token is required for this QARKO OS endpoint.',
  });
  return false;
};

const safeStaticPath = (distDir, pathname) => {
  const decodedPath = decodeURIComponent(pathname);
  const requestedPath = decodedPath === '/' ? '/index.html' : decodedPath;
  const candidate = resolve(join(distDir, requestedPath));
  const distRoot = resolve(distDir);
  return candidate.startsWith(distRoot) ? candidate : join(distRoot, 'index.html');
};

const serveStatic = async ({ requestUrl, response, distDir }) => {
  const url = new URL(requestUrl, 'http://localhost');
  let filePath = safeStaticPath(distDir, url.pathname);

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) {
      filePath = join(distDir, 'index.html');
    }
  } catch {
    filePath = join(distDir, 'index.html');
  }

  if (!existsSync(filePath)) {
    sendJson(response, 404, {
      ok: false,
      error: 'Frontend build not found. Run npm.cmd run build before starting the server.',
    });
    return;
  }

  const extension = extname(filePath);
  response.writeHead(200, {
    'content-type': mimeTypes.get(extension) ?? 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
};

export const createServer = ({
  store = createWorkspaceStore(),
  distDir = defaultDistDir,
  accessToken = process.env.QARKO_ACCESS_TOKEN ?? '',
  discordNotifier = createDiscordNotifier(),
} = {}) =>
  {
    const feedbackRateBuckets = new Map();
    return createHttpServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');

    try {
      if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
        response.writeHead(204, apiCorsHeaders);
        response.end();
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, {
          ok: true,
          service: 'qarko-os',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/workspace') {
        if (!requireAccess(request, response, accessToken)) return;
        sendJson(response, 200, await store.load());
        return;
      }

      if (request.method === 'PUT' && url.pathname === '/api/workspace') {
        if (!requireAccess(request, response, accessToken)) return;
        const snapshot = await readJsonBody(request);
        sendJson(response, 200, await store.save(snapshot));
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/feedback') {
        if (!requireAccess(request, response, accessToken)) return;
        sendJson(response, 200, { feedback: await store.loadFeedback() });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/feedback') {
        if (!consumeRateLimit(feedbackRateBuckets, clientKeyFor(request))) {
          sendJson(response, 429, { ok: false, error: 'Too many feedback submissions. Please try again later.' });
          return;
        }
        const body = await readJsonBody(request);
        const feedback = (Array.isArray(body.feedback) ? body.feedback : [])
          .slice(0, maxFeedbackEntries)
          .map(normalizeFeedbackEntry)
          .filter(Boolean);
        const savedFeedback = await store.appendFeedback(feedback);
        const submittedIds = new Set(feedback.map((item) => item?.id).filter(Boolean));
        const submittedFeedback = savedFeedback.filter((item) => submittedIds.has(item.id));
        const notificationResults = await Promise.allSettled(
          submittedFeedback.map((entry) => discordNotifier.notifyFeedback(entry))
        );
        sendJson(response, 200, {
          ok: true,
          acceptedCount: feedback.length,
          discord: {
            enabled: discordNotifier.enabled,
            sent: notificationResults.filter((result) => result.status === 'fulfilled' && !result.value.skipped).length,
            failed: notificationResults.filter((result) => result.status === 'rejected').length,
          },
        });
        return;
      }

      if (url.pathname.startsWith('/api/')) {
        sendJson(response, 404, { ok: false, error: 'API route not found' });
        return;
      }

      await serveStatic({ requestUrl: request.url ?? '/', response, distDir });
    } catch (error) {
      const status = error.statusCode ?? (error instanceof SyntaxError || String(error.message).includes('Invalid workspace snapshot') ? 400 : 500);
      sendJson(response, status, {
        ok: false,
        error: error.message ?? 'Unexpected server error',
      });
    }
  });
  };

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  createServer().listen(port, host, () => {
    console.log(`QARKO OS server listening on http://${host}:${port}`);
  });
}
