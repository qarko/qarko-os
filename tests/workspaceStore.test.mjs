import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

import { createWorkspaceStore } from '../server/workspaceStore.mjs';

const makeTempStore = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'qarko-store-'));
  const filePath = join(dir, 'workspace.json');
  const cleanup = () => rm(dir, { recursive: true, force: true });
  return { dir, filePath, cleanup };
};

test('workspace store returns a seeded snapshot when no data file exists', async () => {
  const { filePath, cleanup } = await makeTempStore();
  try {
    const store = createWorkspaceStore({ filePath });
    const snapshot = await store.load();

    assert.equal(snapshot.workspace.name, 'QARKO OS');
    assert.ok(Array.isArray(snapshot.projects));
    assert.ok(snapshot.projects.length >= 1);
    assert.ok(Array.isArray(snapshot.approvals));
    assert.ok(Array.isArray(snapshot.feedback));
    assert.ok(snapshot.updatedAt);
  } finally {
    await cleanup();
  }
});

test('workspace store persists and reloads a complete workspace snapshot', async () => {
  const { filePath, cleanup } = await makeTempStore();
  try {
    const store = createWorkspaceStore({ filePath });
    const snapshot = await store.load();
    const changed = {
      ...snapshot,
      actionNotice: 'Railway sync test',
      projects: [
        {
          ...snapshot.projects[0],
          id: 'project-cloud-sync',
          name: 'Cloud Sync Project',
        },
      ],
    };

    await store.save(changed);
    const reloaded = await store.load();

    assert.equal(reloaded.actionNotice, 'Railway sync test');
    assert.equal(reloaded.projects[0].id, 'project-cloud-sync');
    assert.equal(reloaded.projects[0].name, 'Cloud Sync Project');
    assert.deepEqual(reloaded.feedback, []);
    assert.notEqual(reloaded.updatedAt, snapshot.updatedAt);
  } finally {
    await cleanup();
  }
});

test('workspace store appends feedback without replacing existing entries', async () => {
  const { filePath, cleanup } = await makeTempStore();
  try {
    const store = createWorkspaceStore({ filePath });
    const first = {
      id: 'feedback-1',
      area: 'install',
      ease: 'confusing',
      message: 'Installer location was unclear',
      createdAt: '2026. 5. 18. 오후 1:00:00',
    };
    const second = {
      id: 'feedback-2',
      area: 'hermes',
      ease: 'blocked',
      message: 'Hermes setup needs clearer labels',
      createdAt: '2026. 5. 18. 오후 1:05:00',
    };

    await store.appendFeedback([first]);
    const feedback = await store.appendFeedback([second, first]);

    assert.equal(feedback.length, 2);
    assert.equal(feedback[0].id, 'feedback-2');
    assert.equal(feedback[1].id, 'feedback-1');
  } finally {
    await cleanup();
  }
});

test('workspace store caps stored feedback to the newest 500 entries', async () => {
  const { filePath, cleanup } = await makeTempStore();
  try {
    const store = createWorkspaceStore({ filePath });
    const entries = Array.from({ length: 505 }, (_, index) => ({
      id: `feedback-cap-${index}`,
      area: 'other',
      ease: 'easy',
      message: `Feedback ${index}`,
      createdAt: '2026-05-19T00:00:00',
    }));

    const feedback = await store.appendFeedback(entries);

    assert.equal(feedback.length, 500);
    assert.equal(feedback[0].id, 'feedback-cap-0');
    assert.equal(feedback[499].id, 'feedback-cap-499');
  } finally {
    await cleanup();
  }
});

test('workspace store rejects snapshots missing required collections', async () => {
  const { filePath, cleanup } = await makeTempStore();
  try {
    const store = createWorkspaceStore({ filePath });

    await assert.rejects(
      () => store.save({ workspace: { name: 'Broken' } }),
      /Invalid workspace snapshot/
    );
  } finally {
    await cleanup();
  }
});
