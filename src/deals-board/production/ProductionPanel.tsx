import { useState } from 'react';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useTheme } from '../theme/ThemeContext';
import type { LineItemRow } from '../types';
import { Input, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { toLocalInputDate } from '../utils/date-filters';
import {
  clampHourToWorkWindow,
  normalizePrintTime,
  PRINT_WORK_HOURS,
  snapMinuteToTen,
} from '../utils/normalize-print-time';
import { productionChipLabel, productionChipTone } from './board';

const MINUTES = ['00', '10', '20', '30', '40', '50'] as const;

const readString = (item: LineItemRow, field: string) => {
  const value = item[field];
  return typeof value === 'string' ? value : '';
};

const splitTime = (value: string) => {
  const normalized = normalizePrintTime(value);
  const [hour = '09', minute = '00'] = normalized.split(':');
  return {
    hour: clampHourToWorkWindow(hour),
    minute: snapMinuteToTen(minute),
  };
};

export const ProductionPanel = ({ item }: { item: LineItemRow }) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const updateMutation = useUpdateLineItem();
  const [open, setOpen] = useState(false);
  const flagged = item.vProizvodstvo === true;
  const vzato = item.vzatoVRabotuProizvodstva === true;
  const gotovo = item.gotovoProizvodstva === true;
  const [comment, setComment] = useState(readString(item, 'kommentariyDlyaProizvodstva'));
  const [dateValue, setDateValue] = useState(
    item.dataGotovnostiProizvodstva
      ? (toLocalInputDate(String(item.dataGotovnostiProizvodstva)) ?? '')
      : '',
  );
  const initialTime = splitTime(readString(item, 'vremyaGotovnostiProizvodstva'));
  const [hour, setHour] = useState(initialTime.hour);
  const [minute, setMinute] = useState(initialTime.minute);

  const patch = async (data: Record<string, unknown>) => {
    try {
      await updateMutation.mutateAsync({ id: item.id, data });
    } catch (error) {
      window.alert(
        `Не удалось сохранить «Производство».${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  const tone = productionChipTone({ flagged, vzato, gotovo });
  const chipColors =
    tone === 'gotovo'
      ? { background: colors.successMuted, color: colors.success, border: colors.success }
      : tone === 'vzato'
        ? { background: colors.warningMuted, color: colors.warning, border: colors.warning }
        : {
            background: open ? colors.accentMuted : colors.bgElevated,
            color: open ? colors.accentText : colors.text,
            border: open ? colors.accent : colors.borderStrong,
          };

  return (
    <>
      <button
        type="button"
        data-production-chip
        onClick={() => setOpen(true)}
        style={{
          maxWidth: '100%',
          padding: '3px 8px',
          border: `1px solid ${chipColors.border}`,
          borderRadius: 999,
          background: chipColors.background,
          color: chipColors.color,
          cursor: 'pointer',
          font: 'inherit',
          fontWeight: tone === 'idle' ? font.weightMedium : font.weightSemibold,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {productionChipLabel({ flagged, vzato, gotovo })}
      </button>
      <Modal theme={theme} isOpen={open} title="Производство" onClose={() => setOpen(false)}>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={flagged}
            onChange={(event) => void patch({ vProizvodstvo: event.target.checked })}
          />
          В производство
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={vzato}
            onChange={(event) =>
              void patch({ vzatoVRabotuProizvodstva: event.target.checked })
            }
          />
          Взято
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={gotovo}
            onChange={(event) => void patch({ gotovoProizvodstva: event.target.checked })}
          />
          Готово
        </label>
        <Input
          theme={theme}
          type="date"
          aria-label="Дата готовности производства"
          value={dateValue}
          onChange={(event) => {
            setDateValue(event.target.value);
            void patch({ dataGotovnostiProizvodstva: event.target.value || null });
          }}
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <select
            aria-label="Час готовности производства"
            value={hour}
            onChange={(event) => {
              const nextHour = clampHourToWorkWindow(event.target.value);
              setHour(nextHour);
              void patch({ vremyaGotovnostiProizvodstva: `${nextHour}:${minute}` });
            }}
          >
            {PRINT_WORK_HOURS.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select
            aria-label="Минуты готовности производства"
            value={minute}
            onChange={(event) => {
              setMinute(event.target.value);
              void patch({ vremyaGotovnostiProizvodstva: `${hour}:${event.target.value}` });
            }}
          >
            {MINUTES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>
        <Textarea
          theme={theme}
          aria-label="Комментарий для производства"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          onBlur={() => void patch({ kommentariyDlyaProizvodstva: comment })}
        />
      </Modal>
    </>
  );
};
