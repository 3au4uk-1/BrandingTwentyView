export const TELEGRAM_REQUEST_STAGE = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
} as const;

export const TELEGRAM_REQUEST_KIND = {
  QUOTE: 'QUOTE',
  LAYOUT: 'LAYOUT',
  VISUAL: 'VISUAL',
  REVIEW: 'REVIEW',
} as const;

export function canMoveToDone(replyText: string | null | undefined): boolean {
  return Boolean(replyText && replyText.trim());
}
