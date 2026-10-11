import { validateProjectMemory } from './ecomoda-project-memory.mjs';

const LIMITS = Object.freeze({ preferences: 20, verifiedState: 30, nextActions: 20, characters: 12000 });

function newestFirst(a, b, field) {
  return Date.parse(b[field]) - Date.parse(a[field]);
}

/**
 * Converts validated project-only memory into a bounded inference payload.
 * Evidence references stay server-side: the model receives verified statements,
 * never storage paths, publication IDs, credentials, or unrelated biography.
 */
export function buildProjectContext(input) {
  const memory = validateProjectMemory(input);
  const preferences = [...memory.preferences]
    .sort((a, b) => newestFirst(a, b, 'updatedAt'))
    .slice(0, LIMITS.preferences)
    .map(({ area, key, value, updatedAt }) => ({ area, key, value, updatedAt }));
  const verifiedState = [...memory.verifiedState]
    .sort((a, b) => newestFirst(a, b, 'observedAt'))
    .slice(0, LIMITS.verifiedState)
    .map(({ kind, statement, observedAt }) => ({ kind, statement, observedAt }));
  const nextActions = [...memory.nextActions]
    .filter(item => item.status !== 'done')
    .sort((a, b) => newestFirst(a, b, 'updatedAt'))
    .slice(0, LIMITS.nextActions)
    .map(({ id, action, status, updatedAt }) => ({ id, action, status, updatedAt }));
  const context = { schemaVersion: 1, preferences, verifiedState, nextActions };
  const serialized = JSON.stringify(context);
  if (serialized.length > LIMITS.characters) throw Error('Project context exceeds the inference limit');
  return context;
}

export { LIMITS as projectContextLimits };
