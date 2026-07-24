import { useState, type MouseEvent as ReactMouseEvent } from 'react';

import {
  joinPrintComment,
  parsePrintComment,
  plenkaSnippet,
  PRINT_COMMENT_PRESETS,
} from 'src/constants/print-presets';
import { PRINT_FIELD_GROUP_ID } from 'src/constants/print-field-group';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useTheme } from '../theme/ThemeContext';
import type { LineItemRow } from '../types';
import { Button } from '../ui/Button';
import { Input, Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { toLocalInputDate } from '../utils/date-filters';
import {
  formatPrintTimeDisplay,
  normalizePrintTime,
  snapMinuteToTen,
} from '../utils/normalize-print-time';

type PrintPanelChipProps = {
  item: LineItemRow;
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '10', '20', '30', '40', '50'] as const;

const splitTime = (value?: string | null) => {
  const normalized = normalizePrintTime(value);
  const [hour = '00', minute = '00'] = normalized.split(':');
  return { hour, minute: snapMinuteToTen(minute) };
};

export const PrintPanelChip = ({ item }: PrintPanelChipProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const updateMutation = useUpdateLineItem();
  const [open, setOpen] = useState(false);

  const kommentariy =
    typeof item.kommentariyDlyaPechati === 'string' ? item.kommentariyDlyaPechati : '';
  const parsed = parsePrintComment(kommentariy);
  const [selectedPresets, setSelectedPresets] = useState(parsed.presets);
  const [otherText, setOtherText] = useState(parsed.other);
  const [showOther, setShowOther] = useState(Boolean(parsed.other));
  const [dateValue, setDateValue] = useState(
    item.dataGotovnostiPechati
      ? (toLocalInputDate(String(item.dataGotovnostiPechati)) ?? '')
      : '',
  );
  const timeParts = splitTime(
    typeof item.vremyaGotovnostiPechati === 'string' ? item.vremyaGotovnostiPechati : null,
  );
  const [hour, setHour] = useState(timeParts.hour);
  const [minute, setMinute] = useState(timeParts.minute);
  const [plenkaDraft, setPlenkaDraft] = useState(item.plenka?.markdown ?? '');

  const vzato = item.vzatoVRabotu === true;
  const gotovo = item.gotovo === true;
  const snippet = plenkaSnippet(item.plenka);

  const syncDraftsFromItem = () => {
    const next = parsePrintComment(
      typeof item.kommentariyDlyaPechati === 'string' ? item.kommentariyDlyaPechati : '',
    );
    setSelectedPresets(next.presets);
    setOtherText(next.other);
    setShowOther(Boolean(next.other));
    setDateValue(
      item.dataGotovnostiPechati
        ? (toLocalInputDate(String(item.dataGotovnostiPechati)) ?? '')
        : '',
    );
    const t = splitTime(
      typeof item.vremyaGotovnostiPechati === 'string' ? item.vremyaGotovnostiPechati : null,
    );
    setHour(t.hour);
    setMinute(t.minute);
    setPlenkaDraft(item.plenka?.markdown ?? '');
  };

  const openPanel = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    syncDraftsFromItem();
    setOpen(true);
  };

  const patch = async (data: Record<string, unknown>) => {
    try {
      await updateMutation.mutateAsync({ id: item.id, data });
    } catch (error) {
      window.alert(
        `Не удалось сохранить печать.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  const togglePreset = (preset: (typeof PRINT_COMMENT_PRESETS)[number]) => {
    const next = selectedPresets.includes(preset)
      ? selectedPresets.filter((value) => value !== preset)
      : [...selectedPresets, preset];
    setSelectedPresets(next);
    void patch({
      kommentariyDlyaPechati: joinPrintComment(next, showOther ? otherText : ''),
    });
  };

  const saveOther = () => {
    void patch({
      kommentariyDlyaPechati: joinPrintComment(selectedPresets, showOther ? otherText : ''),
    });
  };

  const saveDate = (value: string) => {
    setDateValue(value);
    void patch({ dataGotovnostiPechati: value || null });
  };

  const saveTime = (nextHour: string, nextMinute: string) => {
    setHour(nextHour);
    setMinute(nextMinute);
    void patch({ vremyaGotovnostiPechati: `${nextHour}:${nextMinute}` });
  };

  const savePlenka = () => {
    void patch({ plenka: { markdown: plenkaDraft } });
  };

  const chipParts = [
    'Печать',
    vzato ? 'Взято' : null,
    gotovo ? 'Готово' : null,
    snippet || null,
  ].filter(Boolean);

  return (
    <>
      <button
        type="button"
        data-print-chip
        data-group-id={PRINT_FIELD_GROUP_ID}
        aria-expanded={open}
        onClick={openPanel}
        onMouseDown={(event) => event.stopPropagation()}
        title={chipParts.join(' · ')}
        style={{
          maxWidth: '100%',
          padding: '3px 8px',
          border: `1px solid ${open ? colors.accent : colors.borderStrong}`,
          borderRadius: '999px',
          background: open
            ? colors.accentMuted
            : gotovo
              ? colors.successMuted
              : vzato
                ? colors.accentMuted
                : 'transparent',
          color: open || vzato || gotovo ? colors.accentText : 'inherit',
          cursor: 'pointer',
          font: 'inherit',
          fontWeight: open || gotovo || vzato ? font.weightSemibold : font.weightNormal,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {chipParts.join(' · ')}
      </button>

      <Modal
        theme={theme}
        isOpen={open}
        title="Печать"
        onClose={() => setOpen(false)}
        portalTarget="root"
        footer={
          <div style={{ display: 'flex', gap: spacing.xs, justifyContent: 'flex-end', width: '100%' }}>
            <Button
              theme={theme}
              size="sm"
              variant={vzato ? 'primary' : 'ghost'}
              onClick={() => void patch({ vzatoVRabotu: !vzato })}
            >
              Взято
            </Button>
            <Button
              theme={theme}
              size="sm"
              variant={gotovo ? 'primary' : 'ghost'}
              onClick={() => void patch({ gotovo: !gotovo })}
            >
              Готово
            </Button>
            <div style={{ flex: 1 }} />
            <Button theme={theme} size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: font.sizeXs,
              color: colors.textSecondary,
            }}
          >
            Дата готовности
            <Input
              theme={theme}
              type="date"
              value={dateValue}
              onChange={(event) => saveDate(event.target.value)}
            />
          </label>

          <div style={{ display: 'flex', gap: spacing.xs }}>
            <label
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                fontSize: font.sizeXs,
                color: colors.textSecondary,
              }}
            >
              Час
              <select
                value={hour}
                onChange={(event) => saveTime(event.target.value, minute)}
                style={{
                  height: 32,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.border}`,
                  background: colors.bg,
                  color: colors.text,
                  padding: `0 ${spacing.sm}`,
                }}
              >
                {HOURS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                fontSize: font.sizeXs,
                color: colors.textSecondary,
              }}
            >
              Мин
              <select
                value={minute}
                onChange={(event) => saveTime(hour, event.target.value)}
                style={{
                  height: 32,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.border}`,
                  background: colors.bg,
                  color: colors.text,
                  padding: `0 ${spacing.sm}`,
                }}
              >
                {MINUTES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div style={{ fontSize: font.sizeXs, color: colors.textSecondary }}>
            Комментарий для печати
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
            {PRINT_COMMENT_PRESETS.map((preset) => {
              const active = selectedPresets.includes(preset);
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => togglePreset(preset)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: radius.pill,
                    border: `1px solid ${active ? colors.accent : colors.border}`,
                    background: active ? colors.accentMuted : 'transparent',
                    color: active ? colors.accentText : colors.text,
                    cursor: 'pointer',
                    font: 'inherit',
                    fontSize: font.sizeXs,
                  }}
                >
                  {preset}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                const next = !showOther;
                setShowOther(next);
                if (!next) {
                  setOtherText('');
                  void patch({
                    kommentariyDlyaPechati: joinPrintComment(selectedPresets, ''),
                  });
                }
              }}
              style={{
                padding: '4px 8px',
                borderRadius: radius.pill,
                border: `1px solid ${showOther ? colors.accent : colors.border}`,
                background: showOther ? colors.accentMuted : 'transparent',
                color: showOther ? colors.accentText : colors.text,
                cursor: 'pointer',
                font: 'inherit',
                fontSize: font.sizeXs,
              }}
            >
              другое
            </button>
          </div>
          {showOther ? (
            <Textarea
              theme={theme}
              value={otherText}
              placeholder="Свой комментарий"
              onChange={(event) => setOtherText(event.target.value)}
              onBlur={saveOther}
              rows={2}
            />
          ) : null}

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
              fontSize: font.sizeXs,
              color: colors.textSecondary,
            }}
          >
            Плёнка
            <Textarea
              theme={theme}
              value={plenkaDraft}
              onChange={(event) => setPlenkaDraft(event.target.value)}
              onBlur={savePlenka}
              rows={2}
            />
          </label>

          {typeof item.vremyaGotovnostiPechati === 'string' && item.vremyaGotovnostiPechati ? (
            <div style={{ fontSize: font.sizeXs, color: colors.textMuted }}>
              Время: {formatPrintTimeDisplay(item.vremyaGotovnostiPechati)}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
};
