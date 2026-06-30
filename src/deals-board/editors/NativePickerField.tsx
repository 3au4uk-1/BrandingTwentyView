import type { CSSProperties, ReactNode } from 'react';

type NativePickerFieldProps = {
  type: 'date' | 'time';
  value: string;
  display: ReactNode;
  disabled?: boolean;
  step?: number;
  onChange: (value: string) => void;
  style?: CSSProperties;
};

const openPicker = (input: HTMLInputElement) => {
  try {
    if (typeof input.showPicker === 'function') {
      input.showPicker();
    }
  } catch {
    // Browser opens picker on focus when showPicker is unavailable.
  }
};

export const NativePickerField = ({
  type,
  value,
  display,
  disabled,
  step,
  onChange,
  style,
}: NativePickerFieldProps) => (
  <label
    style={{
      position: 'relative',
      display: 'inline-block',
      minWidth: '2.5em',
      minHeight: '1.4em',
      cursor: disabled ? 'default' : 'pointer',
      ...style,
    }}
  >
    <input
      type={type}
      value={value}
      step={step}
      disabled={disabled}
      onPointerDown={(event) => {
        if (disabled) return;
        openPicker(event.currentTarget);
      }}
      onChange={(event) => onChange(event.target.value)}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        margin: 0,
        padding: 0,
        border: 'none',
        opacity: 0,
        cursor: disabled ? 'default' : 'pointer',
        WebkitAppearance: 'none',
        appearance: 'none',
      }}
    />
    <span style={{ pointerEvents: 'none' }}>{display}</span>
  </label>
);
