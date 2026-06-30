export const openNativePicker = (input: HTMLInputElement | null): void => {
  if (!input) return;

  try {
    if ('showPicker' in input && typeof input.showPicker === 'function') {
      void input.showPicker();
      return;
    }
  } catch {
    // showPicker can throw if not triggered by a user gesture — fall through.
  }

  input.focus({ preventScroll: true });
  input.click();
};
