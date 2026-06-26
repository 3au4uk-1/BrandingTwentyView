import { useMemo, useState } from 'react';

import { LINE_ITEM_STAGES, type LineItemStage } from 'src/constants/stages';

import { useTheme } from './theme/ThemeContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

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

export const QuickFiltersBar = ({ value, onChange, onReset }: QuickFiltersBarProps) => {
  const theme = useTheme();
  const { colors, radius, font, spacing, zIndex } = theme;
  const [isStageFilterOpen, setIsStageFilterOpen] = useState(false);
  const selectedStages = value.stages ?? [];
  const stageOptions = useMemo(() => LINE_ITEM_STAGES, []);

  const toggleStage = (stage: LineItemStage) => {
    const nextStages = selectedStages.includes(stage)
      ? selectedStages.filter((item) => item !== stage)
      : [...selectedStages, stage];

    onChange({ ...value, stages: nextStages });
  };

  const segmentStyle = (isActive: boolean) => ({
    border: 'none',
    padding: '6px 10px',
    fontSize: font.sizeSm,
    fontFamily: font.family,
    fontWeight: isActive ? font.weightMedium : font.weightNormal,
    backgroundColor: isActive ? colors.accentMuted : 'transparent',
    color: isActive ? colors.accentText : colors.textSecondary,
    cursor: 'pointer' as const,
    whiteSpace: 'nowrap' as const,
  });

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: spacing.sm,
        flex: 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          overflow: 'hidden',
          backgroundColor: colors.bgElevated,
        }}
      >
        {(['today', 'week', 'month'] as const).map((preset, index, arr) => {
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
                ...segmentStyle(isActive),
                borderRight: index < arr.length - 1 ? `1px solid ${colors.border}` : 'none',
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
          ...segmentStyle(value.datePreset === 'custom'),
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          backgroundColor: value.datePreset === 'custom' ? colors.accentMuted : colors.bgElevated,
        }}
      >
        {presetLabel.custom}
      </button>

      {value.datePreset === 'custom' ? (
        <>
          <Input
            theme={theme}
            type="date"
            value={value.dateFrom ?? ''}
            onChange={(event) => onChange({ ...value, dateFrom: event.target.value || undefined })}
            style={{ width: 'auto', padding: '6px 10px' }}
          />
          <Input
            theme={theme}
            type="date"
            value={value.dateTo ?? ''}
            onChange={(event) => onChange({ ...value, dateTo: event.target.value || undefined })}
            style={{ width: 'auto', padding: '6px 10px' }}
          />
        </>
      ) : null}

      <div style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setIsStageFilterOpen((prev) => !prev)}
          style={{
            ...segmentStyle(selectedStages.length > 0),
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            backgroundColor: selectedStages.length ? colors.accentMuted : colors.bgElevated,
            color: selectedStages.length ? colors.accentText : colors.textSecondary,
          }}
        >
          Стадии{selectedStages.length ? `: ${selectedStages.length}` : ''}
        </button>

        {isStageFilterOpen ? (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: zIndex.dropdown,
              minWidth: '200px',
              border: `1px solid ${colors.border}`,
              borderRadius: radius.lg,
              backgroundColor: colors.bgElevated,
              boxShadow: colors.shadowLg,
              padding: spacing.sm,
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.xs,
            }}
          >
            {stageOptions.map((stage) => {
              const checked = selectedStages.includes(stage.value);
              return (
                <label
                  key={stage.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    fontSize: font.sizeSm,
                    color: colors.text,
                    cursor: 'pointer',
                    padding: '4px 6px',
                    borderRadius: radius.sm,
                    backgroundColor: checked ? colors.accentMuted : 'transparent',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleStage(stage.value)}
                  />
                  <span>{stage.label}</span>
                </label>
              );
            })}
          </div>
        ) : null}
      </div>

      <Input
        theme={theme}
        type="search"
        value={value.search}
        onChange={(event) => onChange({ ...value, search: event.target.value })}
        placeholder="Поиск сделки..."
        style={{ minWidth: '160px', flex: '1 1 200px', padding: '6px 10px' }}
      />

      <Button theme={theme} variant="ghost" size="sm" onClick={onReset}>
        Сбросить
      </Button>
    </div>
  );
};
