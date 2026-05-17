import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { createSeedWorkspaceSnapshot } from './seedWorkspace.mjs';

const requiredCollections = ['projects', 'approvals', 'artifacts', 'plugins'];

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
};

export const createWorkspaceStore = ({ filePath } = {}) => {
  const resolvedPath = resolve(filePath ?? process.env.QARKO_DATA_FILE ?? '.data/qarko-workspace.json');

  const load = async () => {
    try {
      const raw = await readFile(resolvedPath, 'utf8');
      const snapshot = JSON.parse(raw);
      validateSnapshot(snapshot);
      return snapshot;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return createSeedWorkspaceSnapshot();
    }
  };

  const save = async (snapshot) => {
    validateSnapshot(snapshot);
    const nextSnapshot = {
      ...snapshot,
      updatedAt: new Date().toISOString(),
    };
    await mkdir(dirname(resolvedPath), { recursive: true });
    await writeFile(resolvedPath, `${JSON.stringify(nextSnapshot, null, 2)}\n`, 'utf8');
    return nextSnapshot;
  };

  return {
    filePath: resolvedPath,
    load,
    save,
  };
};
