import { useRef, type ChangeEvent, type CSSProperties } from 'react';

import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { openNativePicker } from '../utils/open-native-picker';

type DatePickerModalProps = {
  objectName: BoardObjectName;
  recordId: string;
  fieldName: string;
  value?: string | null;
};

const toInputDate = (value?: string | null): string => {
  if (!value) return '';
  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
};

const formatDisplayDate = (value?: string | null): string | null => {
  const inputDate = toInputDate(value);
  if (!inputDate) return null;

  const [year, month, day] = inputDate.split('-');
  return `${day}.${month}.${year}`;
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

export const DatePickerModal = ({
  objectName,
  recordId,
  fieldName,
  value,
}: DatePickerModalProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const updateMutation = useUpdateRecord(objectName);
  const inputRef = useRef<HTMLInputElement>(null);

  const open = () => {
    const input = inputRef.current;
    if (!input) return;

    input.value = toInputDate(value);
    requestAnimationFrame(() => {
      openNativePicker(input);
    });
  };

  const handleChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const trimmed = event.target.value.trim();
    const nextValue = trimmed || null;

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

  const displayValue = formatDisplayDate(value);

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
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => void handleChange(event)}
        style={hiddenPickerStyle}
      />
    </>
  );
};
