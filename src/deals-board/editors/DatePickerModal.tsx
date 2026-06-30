import { useState, type MouseEvent } from 'react';

import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { SimpleDateCalendar } from './SimpleDateCalendar';

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

  const displayValue = formatDisplayDate(value);

  return (
    <>
      <button
        type="button"
        onClick={open}
        onMouseDown={(event) => event.stopPropagation()}
        disabled={updateMutation.isPending}
        title="Выбрать дату"
        style={{
          ...cellTriggerStyle,
          color: displayValue ? colors.text : colors.textMuted,
          fontSize: font.sizeSm,
          fontWeight: font.weightMedium,
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
          value={toInputDate(value)}
          onSelect={(isoDate) => void save(isoDate)}
        />
      </Modal>
    </>
  );
};
