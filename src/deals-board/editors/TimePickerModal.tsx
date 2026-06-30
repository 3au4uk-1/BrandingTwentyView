import { useState } from 'react';

import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import {
  formatPrintTimeDisplay,
  normalizePrintTime,
} from '../utils/normalize-print-time';

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
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState('');

  const open = () => {
    setDraftValue(normalizePrintTime(value));
    setIsOpen(true);
  };

  const close = () => {
    setDraftValue(normalizePrintTime(value));
    setIsOpen(false);
  };

  const save = async () => {
    const normalized = normalizePrintTime(draftValue);
    const nextValue = normalized || null;

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

      <Modal
        theme={theme}
        isOpen={isOpen}
        title="Выберите время"
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
          type="time"
          step={60}
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          style={{ width: '100%', fontSize: font.sizeSm }}
        />
      </Modal>
    </>
  );
};
