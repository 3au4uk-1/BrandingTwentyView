export const parseJsonField = (raw: unknown): unknown => {
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return undefined;
    }
  }

  return raw;
};

export const asStringArray = (raw: unknown): string[] => {
  const parsed = parseJsonField(raw);

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((value): value is string => typeof value === 'string');
};
