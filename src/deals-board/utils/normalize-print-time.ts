export const normalizePrintTime = (raw?: string | null): string => {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) return '';

  if (/^\d{1,2}:\d{2}$/.test(trimmed)) {
    const [hours, minutes] = trimmed.split(':');
    return `${hours.padStart(2, '0')}:${minutes}`;
  }

  if (/^\d{3,4}$/.test(trimmed)) {
    const padded = trimmed.padStart(4, '0');
    return `${padded.slice(0, 2)}:${padded.slice(2)}`;
  }

  return trimmed;
};

export const snapMinuteToTen = (minute: string): string => {
  const parsed = Number.parseInt(minute, 10);
  if (Number.isNaN(parsed)) return '00';

  const snapped = (Math.round(parsed / 10) * 10) % 60;
  return String(snapped).padStart(2, '0');
};

export const PRINT_WORK_HOUR_MIN = 8;
export const PRINT_WORK_HOUR_MAX = 22;

export const PRINT_WORK_HOURS: readonly string[] = Array.from(
  { length: PRINT_WORK_HOUR_MAX - PRINT_WORK_HOUR_MIN + 1 },
  (_, i) => String(PRINT_WORK_HOUR_MIN + i).padStart(2, '0'),
);

export const clampHourToWorkWindow = (hour: string): string => {
  const parsed = Number.parseInt(hour, 10);
  if (Number.isNaN(parsed)) return '09';
  const clamped = Math.min(
    PRINT_WORK_HOUR_MAX,
    Math.max(PRINT_WORK_HOUR_MIN, parsed),
  );
  return String(clamped).padStart(2, '0');
};

export const formatPrintTimeDisplay = (raw?: string | null): string | null => {
  const normalized = normalizePrintTime(raw);
  return normalized || null;
};
