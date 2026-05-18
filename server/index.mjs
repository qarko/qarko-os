import { createReadStream, existsSync } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer as createHttpServer } from 'node:http';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
  'access-control-allow-headers': 'accept,content-type',
};

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
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
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

export const createServer = ({ store = createWorkspaceStore(), distDir = defaultDistDir } = {}) =>
  createHttpServer(async (request, response) => {
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
        sendJson(response, 200, await store.load());
        return;
      }

      if (request.method === 'PUT' && url.pathname === '/api/workspace') {
        const snapshot = await readJsonBody(request);
        sendJson(response, 200, await store.save(snapshot));
        return;
      }

      if (request.method === 'GET' && url.pathname === '/api/feedback') {
        sendJson(response, 200, { feedback: await store.loadFeedback() });
        return;
      }

      if (request.method === 'POST' && url.pathname === '/api/feedback') {
        const body = await readJsonBody(request);
        const feedback = Array.isArray(body.feedback) ? body.feedback : [];
        sendJson(response, 200, { feedback: await store.appendFeedback(feedback) });
        return;
      }

      if (url.pathname.startsWith('/api/')) {
        sendJson(response, 404, { ok: false, error: 'API route not found' });
        return;
      }

      await serveStatic({ requestUrl: request.url ?? '/', response, distDir });
    } catch (error) {
      const status = error instanceof SyntaxError || String(error.message).includes('Invalid workspace snapshot') ? 400 : 500;
      sendJson(response, status, {
        ok: false,
        error: error.message ?? 'Unexpected server error',
      });
    }
  });

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? '0.0.0.0';
  createServer().listen(port, host, () => {
    console.log(`QARKO OS server listening on http://${host}:${port}`);
  });
}
