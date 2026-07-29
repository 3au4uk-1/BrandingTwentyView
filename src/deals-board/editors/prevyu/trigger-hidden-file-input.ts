/**
 * Remote DOM element proxies are often truthy but lack real DOM methods
 * (`click` is not a function). Optional chaining only guards nullish.
 */
export const triggerHiddenFileInput = (
  input: { click?: unknown; showPicker?: unknown } | null | undefined,
  fallback: () => void,
): 'opened' | 'fallback' => {
  if (input && typeof input.showPicker === 'function') {
    try {
      (input.showPicker as () => void)();
      return 'opened';
    } catch {
      // fall through to click / fallback
    }
  }

  if (input && typeof input.click === 'function') {
    try {
      (input.click as () => void)();
      return 'opened';
    } catch {
      // fall through to fallback
    }
  }

  fallback();
  return 'fallback';
};
