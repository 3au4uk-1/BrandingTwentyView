import { type CSSProperties, useState } from 'react';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useTheme } from '../theme/ThemeContext';
import type { LineItemFileRef, LineItemRow } from '../types';
import { Button } from '../ui/Button';
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
import { ProductionPhotos } from './ProductionPhotos';

const MINUTES = ['00', '10', '20', '30', '40', '50'] as const;

const readString = (item: LineItemRow, field: string) => {
  const value = item[field];
  return typeof value === 'string' ? value : '';
};

const readFiles = (item: LineItemRow): LineItemFileRef[] => {
  const value = item.fotoProizvodstva;
  return Array.isArray(value) ? (value as LineItemFileRef[]) : [];
};

const splitTime = (value: string) => {
  const normalized = normalizePrintTime(value);
  const [hour = '09', minute = '00'] = normalized.split(':');
  return {
    hour: clampHourToWorkWindow(hour),
    minute: snapMinuteToTen(minute),
  };
};

const sectionLabelStyle = (
  font: { sizeXs: string; weightMedium: number },
  color: string,
): CSSProperties => ({
  fontSize: font.sizeXs,
  color,
  fontWeight: font.weightMedium,
});

const fieldLabelStyle = (
  font: { sizeXs: string; weightMedium: number },
  color: string,
): CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  fontSize: font.sizeXs,
  fontWeight: font.weightMedium,
  color,
});

const statusButtonStyle = (
  active: boolean,
  tone: 'vzato' | 'gotovo',
  colors: {
    success: string;
    successMuted: string;
    warning: string;
    warningMuted: string;
    borderSubtle: string;
    textMuted: string;
    bgElevated: string;
  },
  radius: { pill: string | number },
  font: { sizeXs: string; weightSemibold: number; weightMedium: number },
): CSSProperties => {
  const base: CSSProperties = {
    padding: '4px 10px',
    borderRadius: radius.pill,
    font: 'inherit',
    fontSize: font.sizeXs,
    cursor: 'pointer',
    userSelect: 'none',
  };
  if (!active) {
    return {
      ...base,
      border: `1px solid ${colors.borderSubtle}`,
      background: colors.bgElevated,
      color: colors.textMuted,
      fontWeight: font.weightMedium,
    };
  }
  const on =
    tone === 'gotovo'
      ? { background: colors.successMuted, color: colors.success, border: colors.success }
      : { background: colors.warningMuted, color: colors.warning, border: colors.warning };
  return {
    ...base,
    border: `1px solid ${on.border}`,
    background: on.background,
    color: on.color,
    fontWeight: font.weightSemibold,
  };
};

const selectStyle = (
  colors: { border: string; bgElevated: string; text: string },
  radius: { md: string | number },
  spacing: { sm: string },
): CSSProperties => ({
  height: 36,
  minWidth: 64,
  borderRadius: radius.md,
  border: `1px solid ${colors.border}`,
  background: colors.bgElevated,
  color: colors.text,
  padding: `0 ${spacing.sm}`,
  font: 'inherit',
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: '-0.02em',
});

export const ProductionPanel = ({ item }: { item: LineItemRow }) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
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
  const storedDate = item.dataGotovnostiProizvodstva
    ? (toLocalInputDate(String(item.dataGotovnostiProizvodstva)) ?? '')
    : '';
  const storedTime = readString(item, 'vremyaGotovnostiProizvodstva');

  const patch = async (data: Record<string, unknown>) => {
    try {
      await updateMutation.mutateAsync({ id: item.id, data });
    } catch (error) {
      window.alert(
        `Не удалось сохранить «Производство».${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  const syncDraftsFromItem = () => {
    setComment(readString(item, 'kommentariyDlyaProizvodstva'));
    setDateValue(
      item.dataGotovnostiProizvodstva
        ? (toLocalInputDate(String(item.dataGotovnostiProizvodstva)) ?? '')
        : '',
    );
    const t = splitTime(readString(item, 'vremyaGotovnostiProizvodstva'));
    setHour(t.hour);
    setMinute(t.minute);
  };

  const openPanel = () => {
    syncDraftsFromItem();
    setOpen(true);
  };

  const closePanel = async () => {
    const stored = readString(item, 'kommentariyDlyaProizvodstva');
    if (comment !== stored) {
      await patch({ kommentariyDlyaProizvodstva: comment });
    }
    setOpen(false);
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

  const savedHint = [storedDate, storedTime].filter(Boolean).join(' ');

  return (
    <>
      <button
        type="button"
        data-production-chip
        aria-expanded={open}
        onClick={openPanel}
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          maxWidth: '100%',
          padding: '4px 10px',
          border: `1px solid ${chipColors.border}`,
          borderRadius: 999,
          background: chipColors.background,
          color: chipColors.color,
          cursor: 'pointer',
          font: 'inherit',
          fontSize: font.sizeXs,
          fontWeight: tone === 'idle' && !open ? font.weightMedium : font.weightSemibold,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {productionChipLabel({ flagged, vzato, gotovo })}
      </button>
      <Modal
        theme={theme}
        isOpen={open}
        title="Производство"
        onClose={() => void closePanel()}
        portalTarget="root"
        footer={
          <div style={{ display: 'flex', width: '100%' }}>
            <div style={{ flex: 1 }} />
            <Button theme={theme} size="sm" variant="ghost" onClick={() => void closePanel()}>
              Закрыть
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <label style={{ display: 'flex', gap: 8, alignItems: 'center', ...sectionLabelStyle(font, colors.text) }}>
            <input
              type="checkbox"
              checked={flagged}
              onChange={(event) => void patch({ vProizvodstvo: event.target.checked })}
            />
            В производство
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={sectionLabelStyle(font, colors.textMuted)}>Статус</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <button
                type="button"
                aria-pressed={vzato}
                aria-label={vzato ? 'Взято: да' : 'Взято: нет'}
                style={statusButtonStyle(vzato, 'vzato', colors, radius, font)}
                onClick={() => void patch({ vzatoVRabotuProizvodstva: !vzato })}
              >
                Взято
              </button>
              <button
                type="button"
                aria-pressed={gotovo}
                aria-label={gotovo ? 'Готово: да' : 'Готово: нет'}
                style={statusButtonStyle(gotovo, 'gotovo', colors, radius, font)}
                onClick={() => void patch({ gotovoProizvodstva: !gotovo })}
              >
                Готово
              </button>
            </div>
          </div>

          {savedHint ? (
            <div style={sectionLabelStyle(font, colors.textMuted)}>Сохранено · {savedHint}</div>
          ) : null}

          <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label style={{ flex: '1 1 140px', ...fieldLabelStyle(font, colors.textSecondary) }}>
              Дата
              <Input
                theme={theme}
                type="date"
                aria-label="Дата готовности производства"
                value={dateValue}
                onChange={(event) => {
                  setDateValue(event.target.value);
                  void patch({ dataGotovnostiProizvodstva: event.target.value || null });
                }}
                style={{ height: 36 }}
              />
            </label>
            <label style={fieldLabelStyle(font, colors.textSecondary)}>
              Время
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <select
                  aria-label="Час готовности производства"
                  value={hour}
                  onChange={(event) => {
                    const nextHour = clampHourToWorkWindow(event.target.value);
                    setHour(nextHour);
                    void patch({ vremyaGotovnostiProizvodstva: `${nextHour}:${minute}` });
                  }}
                  style={selectStyle(colors, radius, spacing)}
                >
                  {PRINT_WORK_HOURS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: font.weightSemibold,
                    color: colors.textMuted,
                    lineHeight: 1,
                    paddingBottom: 2,
                  }}
                >
                  :
                </span>
                <select
                  aria-label="Минуты готовности производства"
                  value={minute}
                  onChange={(event) => {
                    setMinute(event.target.value);
                    void patch({ vremyaGotovnostiProizvodstva: `${hour}:${event.target.value}` });
                  }}
                  style={selectStyle(colors, radius, spacing)}
                >
                  {MINUTES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </label>
          </div>

          <label style={fieldLabelStyle(font, colors.textSecondary)}>
            Комментарий
            <Textarea
              theme={theme}
              aria-label="Комментарий для производства"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              onBlur={() => {
                const stored = readString(item, 'kommentariyDlyaProizvodstva');
                if (comment === stored) return;
                void patch({ kommentariyDlyaProizvodstva: comment });
              }}
            />
          </label>

          <ProductionPhotos
            itemId={item.id}
            itemName={typeof item.name === 'string' ? item.name : undefined}
            files={readFiles(item)}
          />
        </div>
      </Modal>
    </>
  );
};
