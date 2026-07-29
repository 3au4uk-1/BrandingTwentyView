import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { LINE_ITEM_TYPES } from 'src/constants/line-item-types';
import { LINE_ITEM_STAGES } from 'src/constants/stages';
import type { DealBoardDatePreset } from 'src/deals-board/types';

import { fetchCompanyNames } from './api/companies';
import { formatFilterClauseLabel } from './filter-model/format-clause-label';
import { beginSessionClauses, commitSessionClauses } from './filter-model/session';
import type { FilterClause, FilterState } from './filter-model/types';
import { useCompanies } from './hooks/useCompanies';
import { useOutsideDismiss } from './hooks/useOutsideDismiss';
import type { FieldDescriptor } from './metadata/types';
import { createId } from './utils/create-id';
import { getPresetRange } from './utils/date-filters';
import { useTheme } from './theme/ThemeContext';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

type FilterDatePreset = Exclude<DealBoardDatePreset, 'future'> | null;

type BuilderField = {
  level: FilterClause['level'];
  field: string;
  label: string;
  kind: 'multi-select' | 'company' | 'oplata';
  options?: ReadonlyArray<{ value: string; label: string }>;
};

const BUILDER_FIELDS: BuilderField[] = [
  {
    level: 'lineItem',
    field: 'stage',
    label: 'Стадия',
    kind: 'multi-select',
    options: LINE_ITEM_STAGES,
  },
  {
    level: 'lineItem',
    field: 'tip',
    label: 'Категория',
    kind: 'multi-select',
    options: LINE_ITEM_TYPES,
  },
  {
    level: 'deal',
    field: 'companyId',
    label: 'Компания',
    kind: 'company',
  },
  {
    level: 'deal',
    field: 'oplata',
    label: 'Оплата',
    kind: 'oplata',
    options: [
      { value: 'filled', label: 'Заполнена' },
      { value: 'empty', label: 'Пустая' },
    ],
  },
];

const presetLabel: Record<Exclude<FilterDatePreset, null>, string> = {
  today: 'Сегодня',
  tomorrow: 'Завтра',
  dayAfterTomorrow: 'Послезавтра',
  week: 'Неделя',
  month: 'Месяц',
  custom: 'Диапазон',
};

const DATE_PRESETS = ['today', 'tomorrow', 'dayAfterTomorrow', 'week', 'month'] as const;

export type FilterBarProps = {
  value: FilterState;
  viewClauses: FilterClause[];
  onChange: (next: FilterState) => void;
  onReset: () => void;
  parentFields?: FieldDescriptor[];
  childFields?: FieldDescriptor[];
  /** compact-top = dates + filter + chips only (search lives in BoardToolbar) */
  layout?: 'default' | 'compact-top';
};

const newClauseId = (): string => createId();

export const FilterBar = ({
  value,
  viewClauses,
  onChange,
  onReset,
  layout = 'default',
}: FilterBarProps) => {
  const theme = useTheme();
  const { colors, radius, font, spacing, zIndex } = theme;
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [activeBuilderField, setActiveBuilderField] = useState<BuilderField | null>(null);
  const [companySearch, setCompanySearch] = useState('');
  const [debouncedCompanySearch, setDebouncedCompanySearch] = useState('');
  const builderRef = useRef<HTMLDivElement | null>(null);
  const dismissBuilder = useCallback(() => {
    setIsBuilderOpen(false);
    setActiveBuilderField(null);
  }, []);
  const dismissLayer = useOutsideDismiss(isBuilderOpen, builderRef, dismissBuilder);

  const effectiveClauses =
    value.sessionClauses === undefined ? viewClauses : value.sessionClauses;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCompanySearch(companySearch), 250);
    return () => clearTimeout(timer);
  }, [companySearch]);

  const companyClause = effectiveClauses.find(
    (clause) => clause.level === 'deal' && clause.field === 'companyId',
  );
  const selectedCompanyIds = useMemo(
    () =>
      Array.isArray(companyClause?.value)
        ? companyClause.value.filter((id): id is string => typeof id === 'string')
        : [],
    [companyClause?.value],
  );

  const companiesQuery = useCompanies(debouncedCompanySearch, isBuilderOpen && activeBuilderField?.kind === 'company');
  const selectedCompanyNamesQuery = useQuery({
    queryKey: ['companyNames', selectedCompanyIds],
    queryFn: () => fetchCompanyNames(selectedCompanyIds),
    enabled: selectedCompanyIds.length > 0,
    staleTime: 60_000,
  });

  const companyNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const company of companiesQuery.data ?? []) {
      map.set(company.id, company.name);
    }
    for (const id of selectedCompanyIds) {
      const name = selectedCompanyNamesQuery.data?.get(id);
      if (name) {
        map.set(id, name);
      }
    }
    return map;
  }, [companiesQuery.data, selectedCompanyIds, selectedCompanyNamesQuery.data]);

  const companyOptions = useMemo(() => {
    const byId = new Map((companiesQuery.data ?? []).map((company) => [company.id, company]));
    for (const id of selectedCompanyIds) {
      if (byId.has(id)) continue;
      const name = selectedCompanyNamesQuery.data?.get(id);
      if (name) {
        byId.set(id, { id, name });
      }
    }
    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name, 'ru'));
  }, [companiesQuery.data, selectedCompanyIds, selectedCompanyNamesQuery.data]);

  const withSessionClauses = (mutator: (clauses: FilterClause[]) => FilterClause[]): void => {
    const base =
      value.sessionClauses === undefined ? beginSessionClauses(viewClauses) : value.sessionClauses;
    onChange({
      ...value,
      sessionClauses: commitSessionClauses(mutator([...base])),
    });
  };

  const upsertClause = (nextClause: FilterClause): void => {
    withSessionClauses((clauses) => {
      const withoutField = clauses.filter(
        (clause) => !(clause.level === nextClause.level && clause.field === nextClause.field),
      );
      return [...withoutField, nextClause];
    });
  };

  const removeClause = (clauseId: string): void => {
    withSessionClauses((clauses) => clauses.filter((clause) => clause.id !== clauseId));
  };

  const toggleMultiValue = (
    field: BuilderField,
    optionValue: string,
  ): void => {
    const existing = effectiveClauses.find(
      (clause) => clause.level === field.level && clause.field === field.field,
    );
    const currentValues = Array.isArray(existing?.value)
      ? existing.value.filter((item): item is string => typeof item === 'string')
      : [];
    const nextValues = currentValues.includes(optionValue)
      ? currentValues.filter((item) => item !== optionValue)
      : [...currentValues, optionValue];

    if (nextValues.length === 0) {
      if (existing) {
        removeClause(existing.id);
      }
      return;
    }

    upsertClause({
      id: existing?.id ?? newClauseId(),
      level: field.level,
      field: field.field,
      operator: 'in',
      value: nextValues,
    });
  };

  const toggleCompany = (companyId: string): void => {
    toggleMultiValue(
      BUILDER_FIELDS.find((field) => field.field === 'companyId')!,
      companyId,
    );
  };

  const setOplata = (oplataValue: 'filled' | 'empty'): void => {
    const existing = effectiveClauses.find(
      (clause) => clause.level === 'deal' && clause.field === 'oplata',
    );
    if (existing && existing.operator === (oplataValue === 'empty' ? 'isEmpty' : 'eq') &&
      (oplataValue === 'empty' || existing.value === oplataValue)) {
      removeClause(existing.id);
      return;
    }

    upsertClause({
      id: existing?.id ?? newClauseId(),
      level: 'deal',
      field: 'oplata',
      operator: oplataValue === 'empty' ? 'isEmpty' : 'eq',
      value: oplataValue === 'empty' ? undefined : oplataValue,
    });
  };

  const segmentStyle = (isActive: boolean) => ({
    border: 'none',
    padding: '5px 9px',
    fontSize: font.sizeSm,
    fontFamily: font.family,
    fontWeight: isActive ? font.weightMedium : font.weightNormal,
    backgroundColor: isActive ? colors.accentMuted : 'transparent',
    color: isActive ? colors.accentText : colors.textSecondary,
    cursor: 'pointer' as const,
    whiteSpace: 'nowrap' as const,
    transition: 'background-color 0.12s ease, color 0.12s ease',
  });

  const openBuilderField = (field: BuilderField) => {
    setActiveBuilderField(field);
    setIsBuilderOpen(true);
    if (field.kind !== 'company') {
      setCompanySearch('');
    }
  };

  const renderBuilderPanel = () => {
    if (!activeBuilderField) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          {BUILDER_FIELDS.map((field) => (
            <button
              key={`${field.level}:${field.field}`}
              type="button"
              onClick={() => openBuilderField(field)}
              style={{
                border: 'none',
                background: 'transparent',
                textAlign: 'left',
                padding: '6px 8px',
                borderRadius: radius.sm,
                fontSize: font.sizeSm,
                color: colors.text,
                cursor: 'pointer',
              }}
            >
              {field.label}
            </button>
          ))}
        </div>
      );
    }

    if (activeBuilderField.kind === 'company') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm, minWidth: '260px' }}>
          <button
            type="button"
            onClick={() => setActiveBuilderField(null)}
            style={{
              alignSelf: 'flex-start',
              border: 'none',
              background: 'transparent',
              color: colors.textMuted,
              fontSize: font.sizeXs,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← Назад
          </button>
          <Input
            theme={theme}
            type="search"
            value={companySearch}
            onChange={(event) => setCompanySearch(event.target.value)}
            placeholder="Найти компанию..."
            style={{ width: '100%', padding: '5px 10px', fontSize: font.sizeSm }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, maxHeight: '240px', overflowY: 'auto' }}>
            {companiesQuery.isLoading ? (
              <span style={{ fontSize: font.sizeSm, color: colors.textMuted, padding: '4px 8px' }}>
                Загрузка...
              </span>
            ) : companyOptions.length === 0 ? (
              <span style={{ fontSize: font.sizeSm, color: colors.textMuted, padding: '4px 8px' }}>
                Компании не найдены
              </span>
            ) : (
              companyOptions.map((company) => {
                const checked = selectedCompanyIds.includes(company.id);
                return (
                  <label
                    key={company.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: spacing.sm,
                      fontSize: font.sizeSm,
                      color: colors.text,
                      cursor: 'pointer',
                      padding: '5px 8px',
                      borderRadius: radius.sm,
                      backgroundColor: checked ? colors.accentMuted : 'transparent',
                    }}
                  >
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
        </div>
      );
    }

    if (activeBuilderField.kind === 'oplata') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, minWidth: '180px' }}>
          <button
            type="button"
            onClick={() => setActiveBuilderField(null)}
            style={{
              alignSelf: 'flex-start',
              border: 'none',
              background: 'transparent',
              color: colors.textMuted,
              fontSize: font.sizeXs,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            ← Назад
          </button>
          {activeBuilderField.options?.map((option) => {
            const existing = effectiveClauses.find(
              (clause) => clause.level === 'deal' && clause.field === 'oplata',
            );
            const checked =
              option.value === 'empty'
                ? existing?.operator === 'isEmpty'
                : existing?.operator === 'eq' && existing.value === option.value;
            return (
              <label
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  fontSize: font.sizeSm,
                  color: colors.text,
                  cursor: 'pointer',
                  padding: '5px 8px',
                  borderRadius: radius.sm,
                  backgroundColor: checked ? colors.accentMuted : 'transparent',
                }}
              >
                <input
                  type="radio"
                  name="oplata-filter"
                  checked={checked}
                  onChange={() => setOplata(option.value as 'filled' | 'empty')}
                />
                <span>{option.label}</span>
              </label>
            );
          })}
        </div>
      );
    }

    const existing = effectiveClauses.find(
      (clause) =>
        clause.level === activeBuilderField.level && clause.field === activeBuilderField.field,
    );
    const selectedValues = Array.isArray(existing?.value)
      ? existing.value.filter((item): item is string => typeof item === 'string')
      : [];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs, minWidth: '220px' }}>
        <button
          type="button"
          onClick={() => setActiveBuilderField(null)}
          style={{
            alignSelf: 'flex-start',
            border: 'none',
            background: 'transparent',
            color: colors.textMuted,
            fontSize: font.sizeXs,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ← Назад
        </button>
        {activeBuilderField.options?.map((option) => {
          const checked = selectedValues.includes(option.value);
          return (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: spacing.sm,
                fontSize: font.sizeSm,
                color: colors.text,
                cursor: 'pointer',
                padding: '5px 8px',
                borderRadius: radius.sm,
                backgroundColor: checked ? colors.accentMuted : 'transparent',
              }}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggleMultiValue(activeBuilderField, option.value)}
              />
              <span>{option.label}</span>
            </label>
          );
        })}
      </div>
    );
  };

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
        {DATE_PRESETS.map((preset, index, arr) => {
          const isActive = value.datePreset === preset;
          return (
            <button
              key={preset}
              type="button"
              data-segment-btn
              data-active={isActive ? 'true' : 'false'}
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
        data-segment-btn
        data-active={value.datePreset === 'custom' ? 'true' : 'false'}
        onClick={() =>
          onChange({
            ...value,
            datePreset: value.datePreset === 'custom' ? undefined : 'custom',
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
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: spacing.xs }}>
          <Input
            theme={theme}
            type="date"
            value={value.dateFrom ?? ''}
            onChange={(event) => onChange({ ...value, dateFrom: event.target.value || undefined })}
            style={{ width: 'auto', padding: '5px 8px', fontSize: font.sizeSm }}
          />
          <span style={{ color: colors.textMuted, fontSize: font.sizeXs }}>-</span>
          <Input
            theme={theme}
            type="date"
            value={value.dateTo ?? ''}
            onChange={(event) => onChange({ ...value, dateTo: event.target.value || undefined })}
            style={{ width: 'auto', padding: '5px 8px', fontSize: font.sizeSm }}
          />
        </div>
      ) : null}

      <div ref={builderRef} style={{ position: 'relative' }}>
        {dismissLayer}
        <button
          type="button"
          data-segment-btn
          onClick={() => {
            setIsBuilderOpen((prev) => !prev);
            if (isBuilderOpen) {
              setActiveBuilderField(null);
            }
          }}
          style={{
            ...segmentStyle(false),
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            backgroundColor: colors.bgElevated,
          }}
        >
          + Фильтр
        </button>

        {isBuilderOpen ? (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              zIndex: zIndex.dropdown,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.lg,
              backgroundColor: colors.bgElevated,
              boxShadow: colors.shadowLg,
              padding: spacing.sm,
            }}
          >
            {renderBuilderPanel()}
          </div>
        ) : null}
      </div>

      {effectiveClauses.map((clause) => (
        <button
          key={clause.id}
          type="button"
          onClick={() => removeClause(clause.id)}
          title="Удалить фильтр"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: spacing.xs,
            padding: '4px 8px',
            borderRadius: radius.pill,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.accentMuted,
            color: colors.accentText,
            fontSize: font.sizeXs,
            fontFamily: font.family,
            cursor: 'pointer',
            maxWidth: '240px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          <span>{formatFilterClauseLabel(clause, companyNameMap)}</span>
          <span aria-hidden="true">×</span>
        </button>
      ))}

      {layout === 'compact-top' ? null : (
        <>
          <Input
            theme={theme}
            type="search"
            value={value.search ?? ''}
            onChange={(event) => onChange({ ...value, search: event.target.value })}
            placeholder="Поиск сделок и позиций..."
            style={{ minWidth: '140px', flex: '1 1 180px', maxWidth: '240px', padding: '5px 10px' }}
          />

          <Button theme={theme} variant="ghost" size="sm" onClick={onReset}>
            Сбросить
          </Button>
        </>
      )}
    </div>
  );
};
