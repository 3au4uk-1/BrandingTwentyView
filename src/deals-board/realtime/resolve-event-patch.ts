import type { ObjectRecordEventProperties } from './types';

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const resolveEventPatch = (
  properties: ObjectRecordEventProperties,
): Record<string, unknown> | undefined => {
  if (isPlainObject(properties.after) && Object.keys(properties.after).length > 0) {
    return properties.after;
  }

  if (!isPlainObject(properties.diff)) return undefined;

  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(properties.diff)) {
    if (isPlainObject(value) && 'after' in value) {
      patch[key] = value.after;
      continue;
    }
    patch[key] = value;
  }

  return Object.keys(patch).length > 0 ? patch : undefined;
};
