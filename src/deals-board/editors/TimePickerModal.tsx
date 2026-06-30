import { useMemo, useState, type MouseEvent } from 'react';

import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeTokens } from '../theme/tokens';
import { EMPTY_VALUE } from '../theme/tokens';
import { Button } from '../ui/Button';
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

type TimeChipProps = {
  theme: ThemeTokens;
  label: string;
  selected: boolean;
  onClick: () => void;
};

const TimeChip = ({ theme, label, selected, onClick }: TimeChipProps) => {
  const { colors, font, radius } = theme;

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: `1px solid ${selected ? colors.accent : colors.border}`,
        borderRadius: radius.md,
        backgroundColor: selected ? colors.accentMuted : colors.bgSecondary,
        color: selected ? colors.accentText : colors.text,
        fontSize: font.sizeSm,
        fontWeight: selected ? font.weightSemibold : font.weightMedium,
        padding: '8px 0',
        cursor: 'pointer',
        transition: 'background-color 0.12s ease, border-color 0.12s ease',
      }}
    >
      {label}
    </button>
  );
};

type TimePickerPanelProps = {
  theme: ThemeTokens;
  hour: string;
  minute: string;
  onHourChange: (hour: string) => void;
  onMinuteChange: (minute: string) => void;
};

const TimePickerPanel = ({
  theme,
  hour,
  minute,
  onHourChange,
  onMinuteChange,
}: TimePickerPanelProps) => {
  const { colors, font, spacing } = theme;

  return (
    <div style={{ display: 'grid', gap: spacing.lg }}>
      <div style={{ display: 'grid', gap: spacing.sm }}>
        <div
          style={{
            fontSize: font.sizeXs,
            fontWeight: font.weightMedium,
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Часы
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gap: spacing.xs,
          }}
        >
          {HOURS.map((item) => (
            <TimeChip
              key={item}
              theme={theme}
              label={item}
              selected={hour === item}
              onClick={() => onHourChange(item)}
            />
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gap: spacing.sm }}>
        <div
          style={{
            fontSize: font.sizeXs,
            fontWeight: font.weightMedium,
            color: colors.textMuted,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
          }}
        >
          Минуты
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gap: spacing.xs,
          }}
        >
          {MINUTES.map((item) => (
            <TimeChip
              key={item}
              theme={theme}
              label={item}
              selected={minute === item}
              onClick={() => onMinuteChange(item)}
            />
          ))}
        </div>
      </div>
    </div>
  );
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
        <TimePickerPanel
          theme={theme}
          hour={hour}
          minute={minute}
          onHourChange={setHour}
          onMinuteChange={setMinute}
        />
      </Modal>
    </>
  );
};
