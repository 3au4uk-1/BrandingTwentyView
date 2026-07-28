import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';

import {
  joinPrintComment,
  parsePrintComment,
  plenkaSnippet,
  PRINT_COMMENT_PRESETS,
} from 'src/constants/print-presets';

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

export type SheetQueueFieldMap = {
  date: string;
  time: string;
  comment: string;
  vzato: string;
  gotovo: string;
  /** Print-only film number / markdown */
  plenka?: boolean;
};

export type SheetQueuePanelProps = {
  item: LineItemRow;
  groupId: string;
  chipLabel: string;
  title: string;
  fields: SheetQueueFieldMap;
  dataChipAttr?: string;
};

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = ['00', '10', '20', '30', '40', '50'] as const;

const splitTime = (value?: string | null) => {
  const normalized = normalizePrintTime(value);
  const [hour = '09', minute = '00'] = normalized.split(':');
  return { hour, minute: snapMinuteToTen(minute) };
};

const readString = (item: LineItemRow, field: string) => {
  const value = item[field];
  return typeof value === 'string' ? value : '';
};

const readBool = (item: LineItemRow, field: string) => item[field] === true;

const selectStyle = (
  colors: { border: string; bg: string; text: string },
  radius: { md: number },
  spacing: { sm: string },
  extra?: CSSProperties,
): CSSProperties => ({
  height: 36,
  minWidth: 64,
  borderRadius: radius.md,
  border: `1px solid ${colors.border}`,
  background: colors.bg,
  color: colors.text,
  padding: `0 ${spacing.sm}`,
  font: 'inherit',
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: '-0.02em',
  ...extra,
});

/**
 * Shared operator panel for print / freza sheet queues.
 * Sheet push/readback stays in crmparser on twentyserver.
 */
export const SheetQueuePanel = ({
  item,
  groupId,
  chipLabel,
  title,
  fields,
  dataChipAttr = 'data-sheet-queue-chip',
}: SheetQueuePanelProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const updateMutation = useUpdateLineItem();
  const [open, setOpen] = useState(false);

  const kommentariy = readString(item, fields.comment);
  const parsed = parsePrintComment(kommentariy);
  const [selectedPresets, setSelectedPresets] = useState(parsed.presets);
  const [otherText, setOtherText] = useState(parsed.other);
  const [showOther, setShowOther] = useState(Boolean(parsed.other));
  const [dateValue, setDateValue] = useState(
    item[fields.date] ? (toLocalInputDate(String(item[fields.date])) ?? '') : '',
  );
  const timeParts = splitTime(readString(item, fields.time) || null);
  const [hour, setHour] = useState(timeParts.hour);
  const [minute, setMinute] = useState(timeParts.minute);
  const [plenkaDraft, setPlenkaDraft] = useState(item.plenka?.markdown ?? '');
  const [maketDraft, setMaketDraft] = useState(item.ssylkaNaMakety?.primaryLinkUrl ?? '');

  const vzato = readBool(item, fields.vzato);
  const gotovo = readBool(item, fields.gotovo);
  const snippet = fields.plenka ? plenkaSnippet(item.plenka) : '';
  const maketUrl = item.ssylkaNaMakety?.primaryLinkUrl?.trim() ?? '';

  const syncDraftsFromItem = () => {
    const next = parsePrintComment(readString(item, fields.comment));
    setSelectedPresets(next.presets);
    setOtherText(next.other);
    setShowOther(Boolean(next.other));
    setDateValue(
      item[fields.date] ? (toLocalInputDate(String(item[fields.date])) ?? '') : '',
    );
    const t = splitTime(readString(item, fields.time) || null);
    setHour(t.hour);
    setMinute(t.minute);
    setPlenkaDraft(item.plenka?.markdown ?? '');
    setMaketDraft(item.ssylkaNaMakety?.primaryLinkUrl ?? '');
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
        `Не удалось сохранить «${title}».${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  const togglePreset = (preset: (typeof PRINT_COMMENT_PRESETS)[number]) => {
    const next = selectedPresets.includes(preset)
      ? selectedPresets.filter((value) => value !== preset)
      : [...selectedPresets, preset];
    setSelectedPresets(next);
    void patch({
      [fields.comment]: joinPrintComment(next, showOther ? otherText : ''),
    });
  };

  const saveOther = () => {
    void patch({
      [fields.comment]: joinPrintComment(selectedPresets, showOther ? otherText : ''),
    });
  };

  const saveDate = (value: string) => {
    setDateValue(value);
    void patch({ [fields.date]: value || null });
  };

  const saveTime = (nextHour: string, nextMinute: string) => {
    setHour(nextHour);
    setMinute(nextMinute);
    void patch({ [fields.time]: `${nextHour}:${nextMinute}` });
  };

  const savePlenka = () => {
    void patch({ plenka: { markdown: plenkaDraft } });
  };

  const saveMaket = () => {
    const trimmed = maketDraft.trim();
    void patch({
      ssylkaNaMakety: {
        primaryLinkUrl: trimmed,
        primaryLinkLabel: trimmed
          ? item.ssylkaNaMakety?.primaryLinkLabel || undefined
          : undefined,
      },
    });
  };

  const chipParts = [
    chipLabel,
    vzato ? 'Взято' : null,
    gotovo ? 'Готово' : null,
    snippet || null,
  ].filter(Boolean);

  const readyHint =
    dateValue && hour && minute
      ? `К отправке · ${dateValue} ${hour}:${minute}`
      : 'Заполни дату и время — уйдёт в таблицу при стадии «В печати»';

  return (
    <>
      <button
        type="button"
        {...{ [dataChipAttr]: true }}
        data-group-id={groupId}
        aria-expanded={open}
        onClick={openPanel}
        onMouseDown={(event) => event.stopPropagation()}
        title={chipParts.join(' · ')}
        style={{
          maxWidth: '100%',
          padding: '4px 10px',
          border: `1px solid ${open ? colors.accent : colors.borderStrong}`,
          borderRadius: '999px',
          background: open
            ? colors.accentMuted
            : gotovo
              ? colors.successMuted
              : vzato
                ? colors.accentMuted
                : colors.bgElevated,
          color: open || vzato || gotovo ? colors.accentText : colors.text,
          cursor: 'pointer',
          font: 'inherit',
          fontSize: font.sizeXs,
          fontWeight: open || gotovo || vzato ? font.weightSemibold : font.weightMedium,
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
        title={title}
        onClose={() => setOpen(false)}
        portalTarget="root"
        footer={
          <div
            style={{
              display: 'flex',
              gap: spacing.xs,
              alignItems: 'center',
              width: '100%',
              flexWrap: 'wrap',
            }}
          >
            <Button
              theme={theme}
              size="sm"
              variant={vzato ? 'primary' : 'ghost'}
              onClick={() => void patch({ [fields.vzato]: !vzato })}
            >
              Взято
            </Button>
            <Button
              theme={theme}
              size="sm"
              variant={gotovo ? 'primary' : 'ghost'}
              onClick={() => void patch({ [fields.gotovo]: !gotovo })}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <div
            style={{
              fontSize: font.sizeXs,
              color: colors.textMuted,
              fontWeight: font.weightMedium,
            }}
          >
            {readyHint}
          </div>

          <div style={{ display: 'flex', gap: spacing.sm, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <label
              style={{
                flex: '1 1 140px',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: font.sizeXs,
                fontWeight: font.weightMedium,
                color: colors.textSecondary,
              }}
            >
              Дата
              <Input
                theme={theme}
                type="date"
                value={dateValue}
                onChange={(event) => saveDate(event.target.value)}
                style={{ height: 36 }}
              />
            </label>

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 6,
                flex: '1 1 160px',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                  fontSize: font.sizeXs,
                  fontWeight: font.weightMedium,
                  color: colors.textSecondary,
                }}
              >
                Время
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <select
                    aria-label="Час"
                    value={hour}
                    onChange={(event) => saveTime(event.target.value, minute)}
                    style={selectStyle(colors, radius, spacing)}
                  >
                    {HOURS.map((value) => (
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
                    aria-label="Минуты"
                    value={minute}
                    onChange={(event) => saveTime(hour, event.target.value)}
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
          </div>

          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: font.sizeXs,
              fontWeight: font.weightMedium,
              color: colors.textSecondary,
            }}
          >
            Ссылка на макет
            <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center' }}>
              <Input
                theme={theme}
                type="url"
                placeholder="https://…"
                value={maketDraft}
                onChange={(event) => setMaketDraft(event.target.value)}
                onBlur={saveMaket}
                style={{ flex: 1, height: 36 }}
              />
              {maketUrl ? (
                <a
                  href={maketUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: font.sizeXs,
                    color: colors.accent,
                    whiteSpace: 'nowrap',
                    fontWeight: font.weightSemibold,
                  }}
                  onClick={(event) => event.stopPropagation()}
                >
                  Открыть
                </a>
              ) : null}
            </div>
          </label>

          <div>
            <div
              style={{
                fontSize: font.sizeXs,
                fontWeight: font.weightMedium,
                color: colors.textSecondary,
                marginBottom: 6,
              }}
            >
              Комментарий
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {PRINT_COMMENT_PRESETS.map((preset) => {
                const active = selectedPresets.includes(preset);
                return (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => togglePreset(preset)}
                    style={{
                      padding: '6px 10px',
                      borderRadius: radius.pill,
                      border: `1px solid ${active ? colors.accent : colors.borderSubtle}`,
                      background: active ? colors.accentMuted : colors.bgElevated,
                      color: active ? colors.accentText : colors.text,
                      cursor: 'pointer',
                      font: 'inherit',
                      fontSize: font.sizeXs,
                      fontWeight: font.weightMedium,
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
                      [fields.comment]: joinPrintComment(selectedPresets, ''),
                    });
                  }
                }}
                style={{
                  padding: '6px 10px',
                  borderRadius: radius.pill,
                  border: `1px solid ${showOther ? colors.accent : colors.borderSubtle}`,
                  background: showOther ? colors.accentMuted : colors.bgElevated,
                  color: showOther ? colors.accentText : colors.text,
                  cursor: 'pointer',
                  font: 'inherit',
                  fontSize: font.sizeXs,
                  fontWeight: font.weightMedium,
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
                style={{ marginTop: 8 }}
              />
            ) : null}
          </div>

          {fields.plenka ? (
            <label
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                fontSize: font.sizeXs,
                fontWeight: font.weightMedium,
                color: colors.textSecondary,
              }}
            >
              № плёнки / заметка
              <Textarea
                theme={theme}
                value={plenkaDraft}
                onChange={(event) => setPlenkaDraft(event.target.value)}
                onBlur={savePlenka}
                rows={2}
              />
            </label>
          ) : null}

          {readString(item, fields.time) ? (
            <div style={{ fontSize: font.sizeXs, color: colors.textMuted }}>
              Сохранено: {formatPrintTimeDisplay(readString(item, fields.time))}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
};
