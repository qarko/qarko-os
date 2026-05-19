import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { createSeedWorkspaceSnapshot } from './seedWorkspace.mjs';

const requiredCollections = ['projects', 'approvals', 'artifacts', 'plugins'];
const maxStoredFeedback = 500;

const normalizeSnapshot = (snapshot) => ({
  ...snapshot,
  feedback: Array.isArray(snapshot.feedback) ? snapshot.feedback : [],
});

const validateSnapshot = (snapshot) => {
  if (!snapshot || typeof snapshot !== 'object') {
    throw new Error('Invalid workspace snapshot: expected object');
  }

  if (!snapshot.workspace || typeof snapshot.workspace.name !== 'string') {
    throw new Error('Invalid workspace snapshot: workspace is required');
  }

  for (const key of requiredCollections) {
    if (!Array.isArray(snapshot[key])) {
      throw new Error(`Invalid workspace snapshot: ${key} must be an array`);
    }
  }

  if (snapshot.feedback !== undefined && !Array.isArray(snapshot.feedback)) {
    throw new Error('Invalid workspace snapshot: feedback must be an array');
  }
};

const mergeFeedback = (current, incoming) => {
  const entries = Array.isArray(incoming) ? incoming : [];
  const seen = new Set();
  return [...entries, ...current].filter((item) => {
    if (!item || typeof item.id !== 'string' || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).slice(0, maxStoredFeedback);
};

export const createWorkspaceStore = ({ filePath } = {}) => {
  const resolvedPath = resolve(filePath ?? process.env.QARKO_DATA_FILE ?? '.data/qarko-workspace.json');

  const load = async () => {
    try {
      const raw = await readFile(resolvedPath, 'utf8');
      const snapshot = JSON.parse(raw);
      validateSnapshot(snapshot);
      return normalizeSnapshot(snapshot);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return createSeedWorkspaceSnapshot();
    }
  };

  const save = async (snapshot) => {
    validateSnapshot(snapshot);
    const normalizedSnapshot = normalizeSnapshot(snapshot);
    const savedAt = new Date();
    if (normalizedSnapshot.updatedAt && savedAt.toISOString() === normalizedSnapshot.updatedAt) {
      savedAt.setMilliseconds(savedAt.getMilliseconds() + 1);
    }
    const nextSnapshot = {
      ...normalizedSnapshot,
      updatedAt: savedAt.toISOString(),
    };
    await mkdir(dirname(resolvedPath), { recursive: true });
    await writeFile(resolvedPath, `${JSON.stringify(nextSnapshot, null, 2)}\n`, 'utf8');
    return nextSnapshot;
  };

  const loadFeedback = async () => {
    const snapshot = await load();
    return snapshot.feedback;
  };

  const appendFeedback = async (feedback) => {
    const snapshot = await load();
    return (await save({
      ...snapshot,
      feedback: mergeFeedback(snapshot.feedback, feedback),
    })).feedback;
  };

  return {
    filePath: resolvedPath,
    load,
    save,
    loadFeedback,
    appendFeedback,
  };
};
