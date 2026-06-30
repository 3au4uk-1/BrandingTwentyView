import { useState } from 'react';

import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';

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
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState('');

  const open = () => {
    setDraftValue(toInputDate(value));
    setIsOpen(true);
  };

  const close = () => {
    setDraftValue(toInputDate(value));
    setIsOpen(false);
  };

  const save = async () => {
    const trimmed = draftValue.trim();
    const nextValue = trimmed || null;

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

      <Modal
        theme={theme}
        isOpen={isOpen}
        title="Выберите дату"
        onClose={close}
        portalTarget="root"
        footer={
          <>
            <Button theme={theme} variant="ghost" size="sm" onClick={close}>
              Отмена
            </Button>
            <Button
              theme={theme}
              variant="primary"
              size="sm"
              onClick={() => void save()}
              disabled={updateMutation.isPending}
            >
              Сохранить
            </Button>
          </>
        }
      >
        <Input
          theme={theme}
          autoFocus
          type="date"
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          style={{ width: '100%', fontSize: font.sizeSm }}
        />
      </Modal>
    </>
  );
};
