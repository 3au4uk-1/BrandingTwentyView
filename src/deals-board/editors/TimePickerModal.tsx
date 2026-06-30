import { useRef, type ChangeEvent, type CSSProperties } from 'react';

import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import {
  formatPrintTimeDisplay,
  normalizePrintTime,
} from '../utils/normalize-print-time';
import { openNativePicker } from '../utils/open-native-picker';

type TimePickerModalProps = {
  objectName: BoardObjectName;
  recordId: string;
  fieldName: string;
  value?: string | null;
};

const hiddenPickerStyle: CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: 0,
  height: 0,
  opacity: 0,
  border: 'none',
  padding: 0,
  margin: 0,
  pointerEvents: 'none',
};

export const TimePickerModal = ({
  objectName,
  recordId,
  fieldName,
  value,
}: TimePickerModalProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const updateMutation = useUpdateRecord(objectName);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    const input = inputRef.current;
    if (!input) return;

    input.value = normalizePrintTime(value);
    requestAnimationFrame(() => {
      openNativePicker(input);
    });
  };

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const normalized = normalizePrintTime(event.target.value);
    const nextValue = normalized || null;

    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: { [fieldName]: nextValue },
      });
    } catch (error) {
      window.alert(
        `Не удалось сохранить значение.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  const displayValue = formatPrintTimeDisplay(value);

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={updateMutation.isPending}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          margin: 0,
          cursor: 'pointer',
          color: colors.text,
          fontSize: font.sizeSm,
          fontWeight: font.weightMedium,
        }}
      >
        {displayValue || EMPTY_VALUE}
      </button>

      <input
        ref={inputRef}
        type="time"
        step={60}
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void handleChange(event)}
        style={hiddenPickerStyle}
      />
    </>
  );
};
