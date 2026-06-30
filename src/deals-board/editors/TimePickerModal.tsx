import { useMemo, useState, type MouseEvent } from 'react';

import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Button } from '../ui/Button';
import { Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import {
  formatPrintTimeDisplay,
  normalizePrintTime,
  snapMinuteToTen,
} from '../utils/normalize-print-time';

type TimePickerModalProps = {
  objectName: BoardObjectName;
  recordId: string;
  fieldName: string;
  value?: string | null;
};

const HOURS = Array.from({ length: 24 }, (_, index) => pad2(index));
const MINUTES = ['00', '10', '20', '30', '40', '50'] as const;

const SELECT_SURFACE = {
  background: '#18181b',
  border: '#3f3f46',
  optionText: '#e4e4e7',
} as const;

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

const splitTime = (value?: string | null) => {
  const normalized = normalizePrintTime(value);
  const [hour = '00', minute = '00'] = normalized.split(':');
  return { hour, minute: snapMinuteToTen(minute) };
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

export const TimePickerModal = ({
  objectName,
  recordId,
  fieldName,
  value,
}: TimePickerModalProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const updateMutation = useUpdateRecord(objectName);
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState('00');
  const [minute, setMinute] = useState('00');

  const open = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const parts = splitTime(value);
    setHour(parts.hour);
    setMinute(parts.minute);
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
  };

  const draftValue = useMemo(() => `${hour}:${minute}`, [hour, minute]);

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

  const selectStyle = {
    flex: 1,
    minWidth: 0,
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
    colorScheme: 'dark' as const,
    backgroundColor: SELECT_SURFACE.background,
    color: SELECT_SURFACE.optionText,
    borderColor: SELECT_SURFACE.border,
  };

  const optionStyle = {
    backgroundColor: SELECT_SURFACE.background,
    color: SELECT_SURFACE.optionText,
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        onMouseDown={(event) => event.stopPropagation()}
        disabled={updateMutation.isPending}
        title="Выбрать время"
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
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Select
            theme={theme}
            value={hour}
            onChange={(event) => setHour(event.target.value)}
            style={selectStyle}
          >
            {HOURS.map((item) => (
              <option key={item} value={item} style={optionStyle}>
                {item}
              </option>
            ))}
          </Select>

          <span style={{ color: colors.textMuted, fontWeight: font.weightSemibold }}>:</span>

          <Select
            theme={theme}
            value={minute}
            onChange={(event) => setMinute(event.target.value)}
            style={selectStyle}
          >
            {MINUTES.map((item) => (
              <option key={item} value={item} style={optionStyle}>
                {item}
              </option>
            ))}
          </Select>
        </div>
      </Modal>
    </>
  );
};
