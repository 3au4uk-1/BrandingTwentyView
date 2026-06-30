import { useState, type MouseEvent } from 'react';

import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { toLocalInputDate } from '../utils/date-filters';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SimpleDateCalendar } from './SimpleDateCalendar';

type DatePickerModalProps = {
  objectName: BoardObjectName;
  recordId: string;
  fieldName: string;
  value?: string | null;
  emphasized?: boolean;
};

const formatDisplayDate = (value?: string | null, hideYear = false): string | null => {
  const inputDate = value ? toLocalInputDate(value) : null;
  if (!inputDate) return null;

  const [year, month, day] = inputDate.split('-');
  return hideYear ? `${day}.${month}` : `${day}.${month}.${year}`;
};

const cellTriggerStyle = {
  border: 'none',
  background: 'transparent',
  padding: '2px 0',
  margin: 0,
  width: '100%',
  minHeight: '24px',
  textAlign: 'left' as const,
  cursor: 'pointer',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap' as const,
};

export const DatePickerModal = ({
  objectName,
  recordId,
  fieldName,
  value,
  emphasized = false,
}: DatePickerModalProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const updateMutation = useUpdateRecord(objectName);
  const [isOpen, setIsOpen] = useState(false);

  const open = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  const save = async (nextValue: string | null) => {
    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: { [fieldName]: nextValue },
      });
      setIsOpen(false);
    } catch (error) {
      window.alert(
        `Не удалось сохранить значение.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  const displayValue = formatDisplayDate(value, emphasized);
  const fullDisplayValue = formatDisplayDate(value);

  return (
    <>
      <button
        type="button"
        onClick={open}
        onMouseDown={(event) => event.stopPropagation()}
        disabled={updateMutation.isPending}
        title={fullDisplayValue ? `Выбрать дату: ${fullDisplayValue}` : 'Выбрать дату'}
        style={{
          ...cellTriggerStyle,
          color: displayValue
            ? colors.text
            : emphasized
              ? colors.textSecondary
              : colors.textMuted,
          fontSize: emphasized ? font.sizeLg : font.sizeSm,
          fontWeight: emphasized ? font.weightBold : font.weightMedium,
          letterSpacing: emphasized ? '0.01em' : undefined,
        }}
      >
        {displayValue || EMPTY_VALUE}
      </button>

      <Modal
        theme={theme}
        isOpen={isOpen}
        title="Выберите дату"
        onClose={close}
        portalTarget="root"
        footer={
          <Button theme={theme} variant="ghost" size="sm" onClick={close}>
            Закрыть
          </Button>
        }
      >
        <SimpleDateCalendar
          theme={theme}
          value={value ? (toLocalInputDate(value) ?? '') : ''}
          onSelect={(isoDate) => void save(isoDate)}
        />
      </Modal>
    </>
  );
};
