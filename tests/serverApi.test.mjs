import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createServer } from '../server/index.mjs';
import { createWorkspaceStore } from '../server/workspaceStore.mjs';

const noopNotifier = {
  enabled: false,
  notifyFeedback: async () => ({ ok: true, skipped: true }),
};

const listen = (server) =>
  new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve(`http://${address.address}:${address.port}`);
    });
  });

const close = (server) => new Promise((resolve) => server.close(resolve));

const withTestServer = async (callback) => {
  const dir = await mkdtemp(join(tmpdir(), 'qarko-api-'));
  const store = createWorkspaceStore({ filePath: join(dir, 'workspace.json') });
  const server = createServer({ store, distDir: join(dir, 'dist'), discordNotifier: noopNotifier });
  const baseUrl = await listen(server);
  try {
    await callback(baseUrl);
  } finally {
    await close(server);
    await rm(dir, { recursive: true, force: true });
  }
};

const withProtectedTestServer = async (callback) => {
  const dir = await mkdtemp(join(tmpdir(), 'qarko-api-'));
  const store = createWorkspaceStore({ filePath: join(dir, 'workspace.json') });
  const server = createServer({ store, distDir: join(dir, 'dist'), accessToken: 'secret-admin-token', discordNotifier: noopNotifier });
  const baseUrl = await listen(server);
  try {
    await callback(baseUrl);
  } finally {
    await close(server);
    await rm(dir, { recursive: true, force: true });
  }
};

test('GET /api/health returns service status', async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.ok, true);
    assert.equal(body.service, 'qarko-os');
  });
});

test('GET and PUT /api/workspace round-trip a workspace snapshot', async () => {
  await withTestServer(async (baseUrl) => {
    const initialResponse = await fetch(`${baseUrl}/api/workspace`);
    const initial = await initialResponse.json();

    const saveResponse = await fetch(`${baseUrl}/api/workspace`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...initial,
        actionNotice: 'Saved through API',
      }),
    });
    const saved = await saveResponse.json();
    const reloadedResponse = await fetch(`${baseUrl}/api/workspace`);
    const reloaded = await reloadedResponse.json();

    assert.equal(initialResponse.status, 200);
    assert.equal(saveResponse.status, 200);
    assert.equal(saved.actionNotice, 'Saved through API');
    assert.equal(reloaded.actionNotice, 'Saved through API');
  });
});

test('PUT /api/workspace rejects invalid JSON snapshots', async () => {
  await withTestServer(async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/workspace`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ workspace: { name: 'Broken' } }),
    });
    const body = await response.json();

    assert.equal(response.status, 400);
    assert.equal(body.ok, false);
    assert.match(body.error, /Invalid workspace snapshot/);
  });
});

test('GET and POST /api/feedback collect tester feedback', async () => {
  await withTestServer(async (baseUrl) => {
    const entry = {
      id: 'feedback-api-1',
      area: 'install',
      ease: 'blocked',
      message: 'I could not find where the installer saved feedback.',
      createdAt: '2026. 5. 18. 오후 1:10:00',
    };

    const saveResponse = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ feedback: [entry] }),
    });
    const saved = await saveResponse.json();
    const loadResponse = await fetch(`${baseUrl}/api/feedback`);
    const loaded = await loadResponse.json();

    assert.equal(saveResponse.status, 200);
    assert.equal(loadResponse.status, 200);
    assert.equal(saved.feedback.length, 1);
    assert.equal(loaded.feedback[0].message, entry.message);
  });
});

test('API routes include CORS headers for the desktop app webview', async () => {
  await withTestServer(async (baseUrl) => {
    const preflight = await fetch(`${baseUrl}/api/feedback`, {
      method: 'OPTIONS',
      headers: {
        origin: 'tauri://localhost',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    });
    const response = await fetch(`${baseUrl}/api/feedback`);

    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-origin'), '*');
    assert.match(preflight.headers.get('access-control-allow-methods'), /POST/);
    assert.equal(response.headers.get('access-control-allow-origin'), '*');
  });
});

test('protected API requires admin token for reads and workspace writes', async () => {
  await withProtectedTestServer(async (baseUrl) => {
    const blockedFeedback = await fetch(`${baseUrl}/api/feedback`);
    const blockedWorkspace = await fetch(`${baseUrl}/api/workspace`);
    const allowedFeedbackPost = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        feedback: [{
          id: 'feedback-public-submit',
          area: 'sync',
          ease: 'confusing',
          message: 'Public beta feedback submit should stay open.',
          createdAt: '2026. 5. 18. 오후 3:00:00',
        }],
      }),
    });
    const allowedFeedbackRead = await fetch(`${baseUrl}/api/feedback`, {
      headers: { 'x-qarko-access-token': 'secret-admin-token' },
    });

    assert.equal(blockedFeedback.status, 401);
    assert.equal(blockedWorkspace.status, 401);
    assert.equal(allowedFeedbackPost.status, 200);
    assert.equal(allowedFeedbackRead.status, 200);
    assert.equal((await allowedFeedbackRead.json()).feedback.length, 1);
  });
});

test('feedback POST sends Discord notification when notifier is configured', async () => {
  const notifications = [];
  const notifier = {
    enabled: true,
    notifyFeedback: async (entry) => {
      notifications.push(entry);
      return { ok: true, skipped: false };
    },
  };
  const dir = await mkdtemp(join(tmpdir(), 'qarko-api-'));
  const store = createWorkspaceStore({ filePath: join(dir, 'workspace.json') });
  const server = createServer({ store, distDir: join(dir, 'dist'), discordNotifier: notifier });
  const baseUrl = await listen(server);
  try {
    const response = await fetch(`${baseUrl}/api/feedback`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        feedback: [{
          id: 'feedback-discord-1',
          area: 'hermes',
          ease: 'blocked',
          testerName: 'Tester A',
          testerContact: '@tester',
          message: 'Hermes wizard disappeared.',
          createdAt: '2026. 5. 18. 오후 3:10:00',
        }],
      }),
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].id, 'feedback-discord-1');
    assert.equal(body.discord.enabled, true);
    assert.equal(body.discord.sent, 1);
  } finally {
    await close(server);
    await rm(dir, { recursive: true, force: true });
  }
});
