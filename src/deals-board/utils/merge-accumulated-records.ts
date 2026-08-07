export const mergeAccumulatedRecords = <T extends { id: string }>(
  prev: T[],
  visible: T[],
  options?: { maxLength?: number },
): T[] => {
  const visibleById = new Map(visible.map((record) => [record.id, record]));
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const record of prev) {
    merged.push(visibleById.get(record.id) ?? record);
    seen.add(record.id);
  }

  for (const record of visible) {
    if (seen.has(record.id)) continue;
    merged.push(record);
    seen.add(record.id);
  }

  const maxLength = options?.maxLength;
  if (typeof maxLength === 'number' && merged.length > maxLength) {
    return merged.slice(0, maxLength);
  }

  return merged;
};
