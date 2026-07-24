export const PRINT_COMMENT_PRESETS = [
  'баннер бб с люверсами',
  'баннер бб без люверсов',
  'пленка бб лам',
  'плоттер',
] as const;

export type PrintCommentPreset = (typeof PRINT_COMMENT_PRESETS)[number];

const PRESET_SET = new Set<string>(PRINT_COMMENT_PRESETS);

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
    const normalized = part.toLowerCase();
    const match = PRINT_COMMENT_PRESETS.find((preset) => preset === normalized || preset === part);
    if (match && !presets.includes(match)) {
      presets.push(match);
    } else if (PRESET_SET.has(normalized)) {
      const preset = PRINT_COMMENT_PRESETS.find((p) => p === normalized);
      if (preset && !presets.includes(preset)) presets.push(preset);
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
