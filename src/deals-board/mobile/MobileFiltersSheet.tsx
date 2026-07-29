import type { DealBoardDatePreset } from '../types';

import {
  FILTER_BUILDER_FIELDS,
  useFilterClauseEditor,
} from '../filter-model/use-filter-clause-editor';
import type { FilterClause, FilterState } from '../filter-model/types';
import { useTheme } from '../theme/ThemeContext';
import { getPresetRange } from '../utils/date-filters';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

type FilterDatePreset = Exclude<DealBoardDatePreset, 'future'> | null | undefined;

type MobileFiltersSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  value: FilterState;
  viewClauses: FilterClause[];
  onChange: (next: FilterState) => void;
  onReset: () => void;
};

const presetLabel: Record<Exclude<Exclude<FilterDatePreset, null | undefined>, null>, string> = {
  today: 'Сегодня',
  tomorrow: 'Завтра',
  dayAfterTomorrow: 'Послезавтра',
  week: 'Неделя',
  month: 'Месяц',
  custom: 'Диапазон',
};

const DATE_PRESETS = ['today', 'tomorrow', 'dayAfterTomorrow', 'week', 'month'] as const;

export const MobileFiltersSheet = ({
  isOpen,
  onClose,
  value,
  viewClauses,
  onChange,
  onReset,
}: MobileFiltersSheetProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const {
    toggleMultiValue,
    toggleCompany,
    setOplata,
    getSelectedValues,
    getOplataValue,
    companySearch,
    setCompanySearch,
    companyOptions,
    companiesQuery,
    selectedCompanyIds,
  } = useFilterClauseEditor(value, viewClauses, onChange, { companySearchEnabled: isOpen });

  const stageField = FILTER_BUILDER_FIELDS.find((field) => field.field === 'stage')!;
  const tipField = FILTER_BUILDER_FIELDS.find((field) => field.field === 'tip')!;
  const oplataField = FILTER_BUILDER_FIELDS.find((field) => field.field === 'oplata')!;
  const selectedStages = getSelectedValues(stageField);
  const selectedTypes = getSelectedValues(tipField);
  const oplataValue = getOplataValue();

  const sectionTitleStyle = {
    fontSize: font.sizeXs,
    fontWeight: font.weightMedium,
    color: colors.textMuted,
    letterSpacing: '-0.01em',
    marginBottom: '8px',
  };

  const segmentStyle = (isActive: boolean) => ({
    border: `1px solid ${isActive ? colors.accent : colors.border}`,
    padding: '8px 10px',
    minHeight: 44,
    fontSize: font.sizeSm,
    fontFamily: font.family,
    fontWeight: isActive ? font.weightMedium : font.weightNormal,
    backgroundColor: isActive ? colors.accentMuted : colors.bg,
    color: isActive ? colors.accentText : colors.textSecondary,
    cursor: 'pointer' as const,
    borderRadius: radius.md,
    touchAction: 'manipulation' as const,
  });

  const checkboxLabelStyle = (checked: boolean) => ({
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: spacing.sm,
    minHeight: 44,
    fontSize: font.sizeSm,
    color: colors.text,
    cursor: 'pointer' as const,
    padding: '6px 8px',
    borderRadius: radius.sm,
    backgroundColor: checked ? colors.accentMuted : 'transparent',
    touchAction: 'manipulation' as const,
  });

  return (
    <BottomSheet theme={theme} isOpen={isOpen} title="Фильтры" onClose={onClose} portalTarget="inline">
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        <section>
          <div style={sectionTitleStyle}>Дата загрузки</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
            {DATE_PRESETS.map((preset) => {
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
                  style={segmentStyle(isActive)}
                >
                  {presetLabel[preset]}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  datePreset: value.datePreset === 'custom' ? undefined : 'custom',
                  dateFrom: value.datePreset === 'custom' ? undefined : value.dateFrom,
                  dateTo: value.datePreset === 'custom' ? undefined : value.dateTo,
                })
              }
              style={segmentStyle(value.datePreset === 'custom')}
            >
              {presetLabel.custom}
            </button>
          </div>
          {value.datePreset === 'custom' ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                marginTop: spacing.sm,
              }}
            >
              <Input
                theme={theme}
                type="date"
                value={value.dateFrom ?? ''}
                onChange={(event) =>
                  onChange({ ...value, dateFrom: event.target.value || undefined })
                }
                style={{ flex: 1, minHeight: 44 }}
              />
              <span style={{ color: colors.textMuted, fontSize: font.sizeXs }}>—</span>
              <Input
                theme={theme}
                type="date"
                value={value.dateTo ?? ''}
                onChange={(event) => onChange({ ...value, dateTo: event.target.value || undefined })}
                style={{ flex: 1, minHeight: 44 }}
              />
            </div>
          ) : null}
        </section>

        <section>
          <div style={sectionTitleStyle}>{stageField.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {stageField.options?.map((option) => {
              const checked = selectedStages.includes(option.value);
              return (
                <label key={option.value} style={checkboxLabelStyle(checked)}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMultiValue(stageField, option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section>
          <div style={sectionTitleStyle}>{tipField.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {tipField.options?.map((option) => {
              const checked = selectedTypes.includes(option.value);
              return (
                <label key={option.value} style={checkboxLabelStyle(checked)}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleMultiValue(tipField, option.value)}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </section>

        <section>
          <div style={sectionTitleStyle}>Компания</div>
          <Input
            theme={theme}
            type="search"
            value={companySearch}
            onChange={(event) => setCompanySearch(event.target.value)}
            placeholder="Найти компанию..."
            style={{ width: '100%', minHeight: 44, marginBottom: spacing.xs }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 200, overflowY: 'auto' }}>
            {companiesQuery.isLoading ? (
              <span style={{ fontSize: font.sizeSm, color: colors.textMuted, padding: '8px' }}>
                Загрузка...
              </span>
            ) : companyOptions.length === 0 ? (
              <span style={{ fontSize: font.sizeSm, color: colors.textMuted, padding: '8px' }}>
                Компании не найдены
              </span>
            ) : (
              companyOptions.map((company) => {
                const checked = selectedCompanyIds.includes(company.id);
                return (
                  <label key={company.id} style={checkboxLabelStyle(checked)}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCompany(company.id)}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {company.name}
                    </span>
                  </label>
                );
              })
            )}
          </div>
        </section>

        <section>
          <div style={sectionTitleStyle}>{oplataField.label}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {oplataField.options?.map((option) => {
              const checked = oplataValue === option.value;
              return (
                <label key={option.value} style={checkboxLabelStyle(checked)}>
                  <input
                    type="radio"
                    name="mobile-oplata-filter"
                    checked={checked}
                    onChange={() => setOplata(option.value as 'filled' | 'empty')}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        </section>
      </div>

      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.lg }}>
        <Button
          theme={theme}
          variant="ghost"
          size="md"
          onClick={onReset}
          style={{ flex: 1, minHeight: 44 }}
        >
          Сбросить
        </Button>
        <Button
          theme={theme}
          variant="primary"
          size="md"
          onClick={onClose}
          style={{ flex: 1, minHeight: 44 }}
        >
          Применить
        </Button>
      </div>
    </BottomSheet>
  );
};
