import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';

const AREAS = new Set(['creative', 'quality', 'publishing', 'operations', 'commercial']);
const FACT_KINDS = new Set(['artifact', 'publication', 'quality', 'analytics', 'operation']);
const ACTION_STATUS = new Set(['pending', 'in_progress', 'blocked', 'done']);
const secretLike = /(-----BEGIN [A-Z ]*PRIVATE KEY-----|\bBearer\s+[A-Za-z0-9._~-]{8,}|\bsk-[A-Za-z0-9_-]{12,}|\b(?:password|passwd|api[_ -]?key|access[_ -]?token|refresh[_ -]?token|client[_ -]?secret)\b\s*[:=])/i;

function object(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error(`${label} must be an object`);
  return value;
}
function exact(value, allowed, label) {
  for (const key of Object.keys(value)) if (!allowed.includes(key)) throw Error(`${label} contains forbidden field: ${key}`);
}
function text(value, label, max) {
  if (typeof value !== 'string' || !value.trim() || value.length > max) throw Error(`${label} must be 1-${max} characters`);
  if (secretLike.test(value)) throw Error(`${label} appears to contain a credential or secret`);
  return value.trim();
}
function timestamp(value, label) {
  const clean = text(value, label, 40);
  if (Number.isNaN(Date.parse(clean))) throw Error(`${label} must be an ISO timestamp`);
  return clean;
}
function list(value, label, max) {
  if (!Array.isArray(value) || value.length > max) throw Error(`${label} must be an array with at most ${max} items`);
  return value;
}
function member(value, allowed, label) {
  if (!allowed.has(value)) throw Error(`${label} is invalid`);
  return value;
}

export function validateProjectMemory(input) {
  const root = object(input, 'memory');
  exact(root, ['schemaVersion', 'preferences', 'verifiedState', 'nextActions'], 'memory');
  if (root.schemaVersion !== 1) throw Error('memory.schemaVersion must be 1');
  const preferences = list(root.preferences, 'preferences', 50).map((entry, index) => {
    const item = object(entry, `preferences[${index}]`);
    exact(item, ['area', 'key', 'value', 'updatedAt'], `preferences[${index}]`);
    const key = text(item.key, `preferences[${index}].key`, 80);
    if (!/^[a-z][a-z0-9_-]*$/.test(key)) throw Error(`preferences[${index}].key must be a safe identifier`);
    return { area: member(item.area, AREAS, `preferences[${index}].area`), key,
      value: text(item.value, `preferences[${index}].value`, 500),
      updatedAt: timestamp(item.updatedAt, `preferences[${index}].updatedAt`) };
  });
  const verifiedState = list(root.verifiedState, 'verifiedState', 100).map((entry, index) => {
    const item = object(entry, `verifiedState[${index}]`);
    exact(item, ['kind', 'statement', 'evidenceRef', 'observedAt'], `verifiedState[${index}]`);
    return { kind: member(item.kind, FACT_KINDS, `verifiedState[${index}].kind`),
      statement: text(item.statement, `verifiedState[${index}].statement`, 1000),
      evidenceRef: text(item.evidenceRef, `verifiedState[${index}].evidenceRef`, 300),
      observedAt: timestamp(item.observedAt, `verifiedState[${index}].observedAt`) };
  });
  const nextActions = list(root.nextActions, 'nextActions', 50).map((entry, index) => {
    const item = object(entry, `nextActions[${index}]`);
    exact(item, ['id', 'action', 'status', 'updatedAt'], `nextActions[${index}]`);
    const id = text(item.id, `nextActions[${index}].id`, 80);
    if (!/^[a-z0-9][a-z0-9_-]*$/.test(id)) throw Error(`nextActions[${index}].id must be a safe identifier`);
    return { id, action: text(item.action, `nextActions[${index}].action`, 500),
      status: member(item.status, ACTION_STATUS, `nextActions[${index}].status`),
      updatedAt: timestamp(item.updatedAt, `nextActions[${index}].updatedAt`) };
  });
  return { schemaVersion: 1, preferences, verifiedState, nextActions };
}

export function createProjectMemoryStore(directory) {
  const root = resolve(directory);
  const key = id => createHash('sha256').update(id).digest('hex');
  const paths = id => ({ state: join(root, `${key(id)}.json`), lock: join(root, `${key(id)}.lock`) });
  const validateId = id => {
    if (typeof id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,79}$/.test(id)) throw Error('projectId must be a safe identifier');
  };
  const load = async id => {
    try { return JSON.parse(await readFile(paths(id).state, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  };
  return {
    async read(projectId) {
      validateId(projectId);
      const record = await load(projectId);
      return record ?? { revision: 0, memory: { schemaVersion: 1, preferences: [], verifiedState: [], nextActions: [] } };
    },
    async update(projectId, input, expectedRevision) {
      validateId(projectId);
      if (!Number.isSafeInteger(expectedRevision) || expectedRevision < 0) throw Error('expectedRevision must be a non-negative integer');
      const memory = validateProjectMemory(input);
      await mkdir(root, { recursive: true, mode: 0o700 });
      const token = randomUUID();
      try { await writeFile(paths(projectId).lock, token, { flag: 'wx', mode: 0o600 }); }
      catch (error) { if (error.code === 'EEXIST') throw Error('Project memory update is busy'); throw error; }
      try {
        const current = await load(projectId);
        const revision = current?.revision ?? 0;
        if (revision !== expectedRevision) throw Error(`Project memory revision conflict: expected ${expectedRevision}, found ${revision}`);
        const record = { revision: revision + 1, memory };
        const temp = `${paths(projectId).state}.${randomUUID()}.tmp`;
        try {
          await writeFile(temp, JSON.stringify(record), { flag: 'wx', mode: 0o600 });
          await rename(temp, paths(projectId).state);
        } finally { await unlink(temp).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
        return record;
      } finally { await unlink(paths(projectId).lock).catch(error => { if (error.code !== 'ENOENT') throw error; }); }
    }
  };
}
