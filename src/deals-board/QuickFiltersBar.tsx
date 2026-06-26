import { useMemo } from 'react';

import { LINE_ITEM_STAGES, type LineItemStage } from 'src/constants/stages';

type QuickDatePreset = 'today' | 'week' | 'month' | 'custom' | null;
type OplataQuickFilter = 'all' | 'filled' | 'empty';

export type QuickFiltersValue = {
  datePreset: QuickDatePreset;
  dateFrom?: string;
  dateTo?: string;
  stages: LineItemStage[];
  oplata: OplataQuickFilter;
  search: string;
};

type QuickFiltersBarProps = {
  colorScheme: 'light' | 'dark';
  value: QuickFiltersValue;
  onChange: (next: QuickFiltersValue) => void;
  onReset: () => void;
};

const toInputDate = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getPresetRange = (preset: Exclude<QuickDatePreset, null>) => {
  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);

  if (preset === 'today') {
    return { dateFrom: toInputDate(start), dateTo: toInputDate(end) };
  }

  if (preset === 'week') {
    const day = today.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    start.setDate(today.getDate() + mondayOffset);
    end.setDate(start.getDate() + 6);
    return { dateFrom: toInputDate(start), dateTo: toInputDate(end) };
  }

  start.setDate(1);
  end.setMonth(end.getMonth() + 1, 0);
  return { dateFrom: toInputDate(start), dateTo: toInputDate(end) };
};

const presetLabel: Record<Exclude<QuickDatePreset, null>, string> = {
  today: 'Сегодня',
  week: 'Неделя',
  month: 'Месяц',
  custom: 'Диапазон',
};

export const QuickFiltersBar = ({ colorScheme, value, onChange, onReset }: QuickFiltersBarProps) => {
  const border = colorScheme === 'dark' ? '#404040' : '#ddd';
  const background = colorScheme === 'dark' ? '#1d1d1d' : '#fff';
  const inputBackground = colorScheme === 'dark' ? '#171717' : '#fff';
  const text = colorScheme === 'dark' ? '#eee' : '#333';
  const muted = colorScheme === 'dark' ? '#9a9a9a' : '#666';
  const activeBackground = colorScheme === 'dark' ? '#2b3340' : '#eaf1ff';

  const stageOptions = useMemo(() => LINE_ITEM_STAGES, []);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '8px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ display: 'inline-flex', border: `1px solid ${border}`, borderRadius: '8px', overflow: 'hidden' }}>
        {(['today', 'week', 'month'] as const).map((preset) => {
          const isActive = value.datePreset === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => {
                const range = getPresetRange(preset);
                onChange({
                  ...value,
                  datePreset: preset,
                  dateFrom: range.dateFrom,
                  dateTo: range.dateTo,
                });
              }}
              style={{
                border: 'none',
                borderRight: preset === 'month' ? 'none' : `1px solid ${border}`,
                padding: '6px 8px',
                fontSize: '12px',
                backgroundColor: isActive ? activeBackground : background,
                color: text,
                cursor: 'pointer',
              }}
            >
              {presetLabel[preset]}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() =>
          onChange({
            ...value,
            datePreset: value.datePreset === 'custom' ? null : 'custom',
            dateFrom: value.datePreset === 'custom' ? undefined : value.dateFrom,
            dateTo: value.datePreset === 'custom' ? undefined : value.dateTo,
          })
        }
        style={{
          border: `1px solid ${border}`,
          borderRadius: '8px',
          backgroundColor: value.datePreset === 'custom' ? activeBackground : background,
          color: text,
          padding: '6px 8px',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        {presetLabel.custom}
      </button>

      {value.datePreset === 'custom' ? (
        <>
          <input
            type="date"
            value={value.dateFrom ?? ''}
            onChange={(event) => onChange({ ...value, dateFrom: event.target.value || undefined })}
            style={{
              border: `1px solid ${border}`,
              borderRadius: '8px',
              backgroundColor: inputBackground,
              color: text,
              padding: '6px 8px',
              fontSize: '12px',
            }}
          />
          <input
            type="date"
            value={value.dateTo ?? ''}
            onChange={(event) => onChange({ ...value, dateTo: event.target.value || undefined })}
            style={{
              border: `1px solid ${border}`,
              borderRadius: '8px',
              backgroundColor: inputBackground,
              color: text,
              padding: '6px 8px',
              fontSize: '12px',
            }}
          />
        </>
      ) : null}

      <select
        multiple
        value={value.stages}
        onChange={(event) => {
          const selected = Array.from(event.target.selectedOptions).map((option) => option.value as LineItemStage);
          onChange({ ...value, stages: selected });
        }}
        style={{
          border: `1px solid ${border}`,
          borderRadius: '8px',
          backgroundColor: inputBackground,
          color: text,
          padding: '6px 8px',
          fontSize: '12px',
          minWidth: '150px',
          height: '72px',
        }}
        aria-label="Фильтр по этапам"
      >
        {stageOptions.map((stage) => (
          <option key={stage.value} value={stage.value}>
            {stage.label}
          </option>
        ))}
      </select>

      <select
        value={value.oplata}
        onChange={(event) =>
          onChange({
            ...value,
            oplata: event.target.value as OplataQuickFilter,
          })
        }
        style={{
          border: `1px solid ${border}`,
          borderRadius: '8px',
          backgroundColor: inputBackground,
          color: text,
          padding: '6px 8px',
          fontSize: '12px',
          minWidth: '140px',
        }}
      >
        <option value="all">Оплата: любая</option>
        <option value="filled">Оплата: заполнена</option>
        <option value="empty">Оплата: пусто</option>
      </select>

      <input
        type="search"
        value={value.search}
        onChange={(event) => onChange({ ...value, search: event.target.value })}
        placeholder="Поиск сделки..."
        style={{
          border: `1px solid ${border}`,
          borderRadius: '8px',
          backgroundColor: inputBackground,
          color: text,
          padding: '6px 8px',
          fontSize: '12px',
          minWidth: '180px',
          flex: '1 1 220px',
        }}
      />

      <button
        type="button"
        onClick={onReset}
        style={{
          border: `1px solid ${border}`,
          borderRadius: '8px',
          backgroundColor: background,
          color: muted,
          padding: '6px 8px',
          fontSize: '12px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Сбросить
      </button>
    </div>
  );
};
