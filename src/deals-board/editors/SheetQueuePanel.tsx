import { useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';

import {
  joinPrintComment,
  parsePrintComment,
  plenkaSnippet,
  PRINT_COMMENT_PRESET_GROUPS,
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
  clampHourToWorkWindow,
  formatPrintTimeDisplay,
  normalizePrintTime,
  PRINT_WORK_HOURS,
  snapMinuteToTen,
} from '../utils/normalize-print-time';
import {
  getPrintSendUiState,
  PRINT_SEND_HINTS,
  type PrintSendUiState,
} from './print-send-state';

export type SheetQueueFieldMap = {
  date: string;
  time: string;
  comment: string;
  vzato: string;
  gotovo: string;
  /** Print-only film number / markdown */
  plenka?: boolean;
  /** Print-only restoration checkbox → Excel column F */
  restoration?: string;
};

export type SheetQueuePanelProps = {
  item: LineItemRow;
  groupId: string;
  chipLabel: string;
  title: string;
  fields: SheetQueueFieldMap;
  dataChipAttr?: string;
  enableSendToPrint?: boolean;
};

const MINUTES = ['00', '10', '20', '30', '40', '50'] as const;

const splitTime = (value?: string | null) => {
  const normalized = normalizePrintTime(value);
  const [hour = '09', minute = '00'] = normalized.split(':');
  return {
    hour: clampHourToWorkWindow(hour),
    minute: snapMinuteToTen(minute),
  };
};

const readString = (item: LineItemRow, field: string) => {
  const value = item[field];
  return typeof value === 'string' ? value : '';
};

const readBool = (item: LineItemRow, field: string) => item[field] === true;

const statusBadgeStyle = (
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
  radius: { pill: number },
  font: { sizeXs: string; weightSemibold: number; weightMedium: number },
): CSSProperties => {
  if (!active) {
    return {
      padding: '4px 10px',
      borderRadius: radius.pill,
      border: `1px solid ${colors.borderSubtle}`,
      background: colors.bgElevated,
      color: colors.textMuted,
      font: 'inherit',
      fontSize: font.sizeXs,
      fontWeight: font.weightMedium,
      cursor: 'default',
      pointerEvents: 'none' as const,
      userSelect: 'none' as const,
    };
  }
  const on =
    tone === 'gotovo'
      ? { background: colors.successMuted, color: colors.success, border: colors.success }
      : { background: colors.warningMuted, color: colors.warning, border: colors.warning };
  return {
    padding: '4px 10px',
    borderRadius: radius.pill,
    border: `1px solid ${on.border}`,
    background: on.background,
    color: on.color,
    font: 'inherit',
    fontSize: font.sizeXs,
    fontWeight: font.weightSemibold,
    cursor: 'default',
    pointerEvents: 'none' as const,
    userSelect: 'none' as const,
  };
};

const selectStyle = (
  colors: { border: string; bgElevated: string; text: string },
  radius: { md: number },
  spacing: { sm: string },
  extra?: CSSProperties,
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
  enableSendToPrint = false,
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
  const restoration = fields.restoration ? readBool(item, fields.restoration) : false;
  const snippet = fields.plenka ? plenkaSnippet(item.plenka) : '';
  const maketUrl = item.ssylkaNaMakety?.primaryLinkUrl?.trim() ?? '';

  const formatChipLabel = () => {
    if (gotovo) {
      return snippet
        ? `${chipLabel} - Готово - ${snippet}`
        : `${chipLabel} - Готово`;
    }
    if (vzato) {
      return `${chipLabel} - взято`;
    }
    return chipLabel;
  };

  const chipText = formatChipLabel();
  const chipTone: 'idle' | 'vzato' | 'gotovo' = gotovo ? 'gotovo' : vzato ? 'vzato' : 'idle';

  const chipColors =
    chipTone === 'gotovo'
      ? {
          background: colors.successMuted,
          color: colors.success,
          border: colors.success,
        }
      : chipTone === 'vzato'
        ? {
            background: colors.warningMuted,
            color: colors.warning,
            border: colors.warning,
          }
        : {
            background: open ? colors.accentMuted : colors.bgElevated,
            color: open ? colors.accentText : colors.text,
            border: open ? colors.accent : colors.borderStrong,
          };

  const persistClampedTimeIfNeeded = () => {
    const raw = readString(item, fields.time);
    const normalized = normalizePrintTime(raw);
    if (!normalized) return;

    const [rawHour = '09', rawMinute = '00'] = normalized.split(':');
    const clampedHour = clampHourToWorkWindow(rawHour);
    const snappedMinute = snapMinuteToTen(rawMinute);
    const clampedTime = `${clampedHour}:${snappedMinute}`;

    if (clampedTime !== normalized) {
      setHour(clampedHour);
      setMinute(snappedMinute);
      void patch({ [fields.time]: clampedTime });
    }
  };

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
    persistClampedTimeIfNeeded();
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
    const clampedHour = clampHourToWorkWindow(nextHour);
    setHour(clampedHour);
    setMinute(nextMinute);
    void patch({ [fields.time]: `${clampedHour}:${nextMinute}` });
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
    vzato ? 'взято' : null,
    gotovo ? 'Готово' : null,
    gotovo ? snippet || null : null,
  ].filter(Boolean);

  const timeValue = hour && minute ? `${hour}:${minute}` : '';
  const printSendState: PrintSendUiState | null = enableSendToPrint
    ? getPrintSendUiState({
        date: dateValue,
        time: timeValue,
        requested: item.printSheetExportRequested === true,
        sessionId: item.printSheetSessionId,
        stage: item.stage,
      })
    : null;

  const sendHint = printSendState ? PRINT_SEND_HINTS[printSendState] : '';
  const readyHint = enableSendToPrint
    ? sendHint
    : dateValue && hour && minute
      ? `К отправке · ${dateValue} ${hour}:${minute}`
      : 'Заполни дату и время — уйдёт в таблицу при стадии «В печати»';

  const sendToPrint = () => {
    void patch({ printSheetExportRequested: true });
  };

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
          border: `1px solid ${chipColors.border}`,
          borderRadius: '999px',
          background: chipColors.background,
          color: chipColors.color,
          cursor: 'pointer',
          font: 'inherit',
          fontSize: font.sizeXs,
          fontWeight:
            open || gotovo || vzato ? font.weightSemibold : font.weightMedium,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {chipText}
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
            {fields.restoration ? (
              <Button
                theme={theme}
                size="sm"
                variant={restoration ? 'primary' : 'ghost'}
                onClick={() => void patch({ [fields.restoration!]: !restoration })}
              >
                Реставрация
              </Button>
            ) : null}
            {enableSendToPrint ? (
              <Button
                theme={theme}
                size="sm"
                variant="primary"
                disabled={printSendState !== 'ready'}
                onClick={sendToPrint}
              >
                Отправить в печать
              </Button>
            ) : null}
            <div style={{ flex: 1 }} />
            <Button theme={theme} size="sm" variant="ghost" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                fontSize: font.sizeXs,
                color: colors.textMuted,
                fontWeight: font.weightMedium,
              }}
            >
              Статус с листа
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <span
                aria-label={vzato ? 'Взято: да' : 'Взято: нет'}
                style={statusBadgeStyle(vzato, 'vzato', colors, radius, font)}
              >
                Взято
              </span>
              <span
                aria-label={gotovo ? 'Готово: да' : 'Готово: нет'}
                style={statusBadgeStyle(gotovo, 'gotovo', colors, radius, font)}
              >
                Готово
              </span>
            </div>
          </div>

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
            </div>
            {maketUrl ? (
              <a
                href={maketUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: 6,
                  fontSize: font.sizeXs,
                  color: colors.accent,
                  fontWeight: font.weightSemibold,
                  alignSelf: 'flex-start',
                }}
                onClick={(event) => event.stopPropagation()}
              >
                Открыть макет
              </a>
            ) : (
              <span
                style={{
                  marginTop: 6,
                  fontSize: font.sizeXs,
                  color: colors.textMuted,
                }}
              >
                Ссылка откроется здесь после сохранения
              </span>
            )}
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {PRINT_COMMENT_PRESET_GROUPS.map((group) => (
                <div key={group.category} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div
                    style={{
                      fontSize: font.sizeXs,
                      fontWeight: font.weightSemibold,
                      color: colors.textMuted,
                      letterSpacing: '0.02em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {group.category}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {group.presets.map((preset) => {
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
                            textAlign: 'left',
                            lineHeight: 1.35,
                            maxWidth: '100%',
                          }}
                        >
                          {preset}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
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
              Сохранено: {formatPrintTimeDisplay(`${hour}:${minute}`)}
            </div>
          ) : null}
        </div>
      </Modal>
    </>
  );
};
