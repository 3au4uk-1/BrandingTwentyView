const TEMPLATE_PREFIX = 'брендинг свободная запись';

export const isBrandingFreeEntryName = (name: string | null | undefined): boolean => {
  const n = (name || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return n.startsWith(TEMPLATE_PREFIX);
};

/** First non-empty line of comment, trimmed. */
export const commentToLineItemName = (kommentariy: string | null | undefined): string | null => {
  const text = (kommentariy || '').trim();
  if (!text) return null;
  const firstLine = text.split(/\r?\n/)[0]?.trim() ?? '';
  return firstLine || null;
};

/**
 * One-shot: if name is still the free-entry template and comment has text,
 * rename to comment. Returns null when no rename should happen.
 */
export const planBrandingFreeNameRename = (
  name: string | null | undefined,
  kommentariy: string | null | undefined,
): string | null => {
  if (!isBrandingFreeEntryName(name)) return null;
  return commentToLineItemName(kommentariy);
};
