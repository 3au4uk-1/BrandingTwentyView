type OpenNativePickerOptions = {
  type: 'date' | 'time';
  value: string;
  anchor: HTMLElement;
  onPick: (value: string) => void;
  step?: number;
};

const HIDDEN_INPUT_STYLE: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  top: '0',
  left: '0',
  width: '1px',
  height: '1px',
  opacity: '0',
  border: 'none',
  padding: '0',
  margin: '0',
  pointerEvents: 'none',
};

export const openNativePicker = ({
  type,
  value,
  anchor,
  onPick,
  step,
}: OpenNativePickerOptions): void => {
  const doc = anchor.ownerDocument;
  const input = doc.createElement('input');
  input.type = type;
  input.value = value;

  if (type === 'time' && step !== undefined) {
    input.step = String(step);
  }

  Object.assign(input.style, HIDDEN_INPUT_STYLE);
  input.setAttribute('tabindex', '-1');
  input.setAttribute('aria-hidden', 'true');

  const cleanup = () => {
    input.removeEventListener('change', handleChange);
    input.removeEventListener('blur', handleBlur);
    input.remove();
  };

  const handleChange = () => {
    onPick(input.value);
    cleanup();
  };

  const handleBlur = () => {
    window.setTimeout(() => {
      if (doc.body.contains(input)) cleanup();
    }, 300);
  };

  input.addEventListener('change', handleChange);
  input.addEventListener('blur', handleBlur);
  doc.body.appendChild(input);

  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
      return;
    }
  } catch {
    // showPicker requires a user gesture or may be unavailable — fall through.
  }

  if (typeof input.click === 'function') {
    input.click();
    return;
  }

  cleanup();
};
