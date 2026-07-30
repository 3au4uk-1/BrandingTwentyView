export const PRINT_COMMENT_PRESET_GROUPS = [
  {
    category: 'Пленка',
    presets: [
      'Пленка ББ + лам + резка по формату (кол-во прописано)',
      'Пленка НЕ ББ + лам + резка по формату (кол-во прописано)',
    ],
  },
  {
    category: 'Баннер',
    presets: [
      'Баннер ББ + резка по формату (кол-во прописано)',
      'Баннер ББ + ЛЮВЕРСЫ по периметру + резка по формату (кол-во прописано)',
    ],
  },
  {
    category: 'Плоттер',
    presets: ['Плоттер с выборкой на монтажке'],
  },
] as const;

export const PRINT_COMMENT_PRESETS = PRINT_COMMENT_PRESET_GROUPS.flatMap(
  (group) => group.presets,
);

export type PrintCommentPreset = (typeof PRINT_COMMENT_PRESETS)[number];

const PRESET_BY_NORMALIZED = new Map(
  PRINT_COMMENT_PRESETS.map((preset) => [preset.toLowerCase(), preset] as const),
);

const PRESET_JOIN = '; ';

export type ParsedPrintComment = {
  presets: PrintCommentPreset[];
  other: string;
};

export const parsePrintComment = (value: string | null | undefined): ParsedPrintComment => {
  const text = (value || '').trim();
  if (!text) return { presets: [], other: '' };

  const parts = text
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  const presets: PrintCommentPreset[] = [];
  const otherParts: string[] = [];

  for (const part of parts) {
    const match = PRESET_BY_NORMALIZED.get(part.toLowerCase());
    if (match && !presets.includes(match)) {
      presets.push(match);
    } else {
      otherParts.push(part);
    }
  }

  return { presets, other: otherParts.join(PRESET_JOIN) };
};

export const joinPrintComment = (
  presets: readonly string[],
  other: string,
): string | null => {
  const uniquePresets = PRINT_COMMENT_PRESETS.filter((preset) => presets.includes(preset));
  const otherTrimmed = other.trim();
  const parts = [...uniquePresets, ...(otherTrimmed ? [otherTrimmed] : [])];
  if (parts.length === 0) return null;
  return parts.join(PRESET_JOIN);
};

export const plenkaSnippet = (
  plenka: { markdown?: string } | null | undefined,
  maxLen = 24,
): string => {
  const first = (plenka?.markdown || '').trim().split(/\r?\n/)[0]?.trim() ?? '';
  if (!first) return '';
  if (first.length <= maxLen) return first;
  return `${first.slice(0, Math.max(0, maxLen - 1))}…`;
};
