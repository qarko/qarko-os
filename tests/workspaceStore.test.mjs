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
    assert.notEqual(reloaded.updatedAt, snapshot.updatedAt);
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
