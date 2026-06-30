import type { MouseEvent } from 'react';

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

export const DatePickerModal = ({
  objectName,
  recordId,
  fieldName,
  value,
}: DatePickerModalProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const updateMutation = useUpdateRecord(objectName);

  const open = (event: MouseEvent<HTMLButtonElement>) => {
    openNativePicker({
      type: 'date',
      value: toInputDate(value),
      anchor: event.currentTarget,
      onPick: (pickedValue) => {
        void (async () => {
          const trimmed = pickedValue.trim();
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
        })();
      },
    });
  };

  const displayValue = formatDisplayDate(value);

  return (
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
  );
};
