import type { MouseEvent } from 'react';

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

export const TimePickerModal = ({
  objectName,
  recordId,
  fieldName,
  value,
}: TimePickerModalProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const updateMutation = useUpdateRecord(objectName);

  const open = (event: MouseEvent<HTMLButtonElement>) => {
    openNativePicker({
      type: 'time',
      value: normalizePrintTime(value),
      step: 60,
      anchor: event.currentTarget,
      onPick: (pickedValue) => {
        void (async () => {
          const normalized = normalizePrintTime(pickedValue);
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
        })();
      },
    });
  };

  const displayValue = formatPrintTimeDisplay(value);

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
