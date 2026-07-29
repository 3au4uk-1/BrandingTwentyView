import { useMemo, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import { currencyToRub, formatRub, type CurrencyAmount } from './analytics/compute';
import { FilterBar } from './FilterBar';
import { ExpandModeToggle } from './ExpandModeToggle';
import { ToolbarSettingsCluster } from './ToolbarSettingsCluster';
import { ViewSwitcher } from './ViewSwitcher';
import { getChipPalette, type ChipColor } from './Chip';
import { useTheme } from './theme/ThemeContext';
import type { FilterClause, FilterState } from './filter-model/types';
import type { FieldDescriptor } from './metadata/types';
import type {
  ColumnConfig,
  ColumnGroupConfig,
  DealBoardViewRecord,
  LineItemRow,
  OpportunityRow,
} from './types';
import {
  countDealsByPrefix,
  DEAL_PREFIX_LABELS,
  DEAL_PREFIX_ORDER,
  type DealPrefix,
} from './utils/deal-prefix';
import { addSearchTerm } from './utils/search';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

const PREFIX_COLOR: Record<Exclude<DealPrefix, 'OTHER'>, ChipColor> = {
  PRO: 'purple',
  ARENDA: 'blue',
  ART: 'green',
  BIRZHA: 'yellow',
  BS: 'gray',
};

type BoardToolbarProps = {
  views: DealBoardViewRecord[];
  activeViewId?: string;
  onSelectView: (id: string) => void;
  onCreateView: () => void;
  filterValue: FilterState;
  viewClauses: FilterClause[];
  onFilterChange: (next: FilterState) => void;
  onFilterReset: () => void;
  parentFields: FieldDescriptor[];
  childFields: FieldDescriptor[];
  deals: OpportunityRow[];
  lineItems: LineItemRow[];
  dealCount: number;
  isLoading?: boolean;
  onOpenAnalytics: () => void;
  settingsDisabled?: boolean;
  onEditView: () => void;
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  childGroups: ColumnGroupConfig[];
  onParentColumnsSave: (columns: ColumnConfig[]) => Promise<void>;
  onChildColumnsSave: (columns: ColumnConfig[], groups: ColumnGroupConfig[]) => Promise<void>;
  activeFilterCount?: number;
  /** Show «Сбросить» only when session differs from the active view. */
  canResetFilters?: boolean;
};

export const BoardToolbar = ({
  views,
  activeViewId,
  onSelectView,
  onCreateView,
  filterValue,
  viewClauses,
  onFilterChange,
  onFilterReset,
  parentFields,
  childFields,
  deals,
  lineItems,
  dealCount,
  isLoading = false,
  onOpenAnalytics,
  settingsDisabled = false,
  onEditView,
  parentColumns,
  childColumns,
  childGroups,
  onParentColumnsSave,
  onChildColumnsSave,
  activeFilterCount: _activeFilterCount = 0,
  canResetFilters = false,
}: BoardToolbarProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius, colorScheme } = theme;

  const prefixCounts = useMemo(() => countDealsByPrefix(deals), [deals]);
  const turnoverRub = useMemo(
    () =>
      lineItems
        .filter((item) => item.stage !== 'OTMENA')
        .reduce((sum, item) => sum + currencyToRub(item.amount as CurrencyAmount | undefined), 0),
    [lineItems],
  );

  const searchTerms = filterValue.searchTerms ?? [];
  const draftSearch = filterValue.search ?? '';
  const showReset = canResetFilters;

  const commitDraftTerm = () => {
    const nextTerms = addSearchTerm(searchTerms, draftSearch);
    if (nextTerms.length === searchTerms.length && !draftSearch.trim()) return;
    onFilterChange({
      ...filterValue,
      searchTerms: nextTerms,
      search: '',
    });
  };

  const removeTerm = (term: string) => {
    onFilterChange({
      ...filterValue,
      searchTerms: searchTerms.filter((value) => value.toLowerCase() !== term.toLowerCase()),
    });
  };

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDraftTerm();
      return;
    }
    if (event.key === 'Backspace' && !draftSearch && searchTerms.length > 0) {
      event.preventDefault();
      removeTerm(searchTerms[searchTerms.length - 1]!);
    }
  };

  return (
    <header
      data-deals-board-toolbar
      style={{
        borderBottom: `1px solid ${colors.borderSubtle}`,
        backgroundColor: 'transparent',
        padding: `${spacing.sm} ${spacing.md}`,
        display: 'flex',
        alignItems: 'stretch',
        gap: spacing.md,
        minWidth: 0,
      }}
    >
      <div
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            flexWrap: 'wrap',
            minWidth: 0,
          }}
        >
          <ViewSwitcher
            views={views}
            activeViewId={activeViewId}
            onSelectView={onSelectView}
            onCreateView={onCreateView}
          />
          <FilterBar
            value={filterValue}
            viewClauses={viewClauses}
            onChange={onFilterChange}
            onReset={onFilterReset}
            parentFields={parentFields}
            childFields={childFields}
            layout="compact-top"
          />
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            minWidth: 0,
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              flexWrap: 'wrap',
              minHeight: 34,
              padding: '4px 8px',
              borderRadius: radius.md,
              border: `1px solid ${colors.border}`,
              backgroundColor: colors.bgElevated,
            }}
          >
            {searchTerms.map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => removeTerm(term)}
                title={`Убрать «${term}»`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: radius.pill,
                  border: `1px solid ${colors.border}`,
                  backgroundColor: colors.accentMuted,
                  color: colors.accentText,
                  fontSize: font.sizeXs,
                  fontFamily: font.family,
                  cursor: 'pointer',
                  maxWidth: 180,
                }}
              >
                <span
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {term}
                </span>
                <span aria-hidden="true">×</span>
              </button>
            ))}
            <Input
              theme={theme}
              type="search"
              value={draftSearch}
              onChange={(event) =>
                onFilterChange({ ...filterValue, search: event.target.value })
              }
              onKeyDown={onSearchKeyDown}
              placeholder={
                searchTerms.length > 0
                  ? 'Ещё слово + Enter…'
                  : 'Поиск: слово + Enter для нескольких, или просто текст'
              }
              style={{
                flex: 1,
                minWidth: 140,
                height: 26,
                padding: '0 4px',
                border: 'none',
                background: 'transparent',
                boxShadow: 'none',
                fontSize: font.sizeSm,
              }}
            />
          </div>
          {showReset ? (
            <Button theme={theme} variant="ghost" size="sm" onClick={onFilterReset}>
              Сбросить
            </Button>
          ) : null}
        </div>
      </div>

      <div
        style={{
          flex: '0 1 340px',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 6,
          alignContent: 'center',
          minWidth: 0,
        }}
      >
        {!isLoading ? (
          <span
            style={{
              fontSize: font.sizeXs,
              color: colors.textMuted,
              fontVariantNumeric: 'tabular-nums',
              whiteSpace: 'nowrap',
            }}
          >
            {dealCount} сд
          </span>
        ) : null}
        {DEAL_PREFIX_ORDER.map((prefix) => {
          const count = prefixCounts[prefix];
          if (count <= 0) return null;
          const palette = getChipPalette(PREFIX_COLOR[prefix], colorScheme);
          return (
            <span
              key={prefix}
              title={DEAL_PREFIX_LABELS[prefix]}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '3px 8px',
                borderRadius: radius.md,
                backgroundColor: colors.bgElevated,
                boxShadow: `inset 0 0 0 1px ${palette.text}44`,
                fontSize: 10,
                fontWeight: font.weightMedium,
                color: colors.textSecondary,
                fontVariantNumeric: 'tabular-nums',
                whiteSpace: 'nowrap',
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: palette.text,
                }}
              />
              {DEAL_PREFIX_LABELS[prefix]} {count}
            </span>
          );
        })}
        <button
          type="button"
          onClick={onOpenAnalytics}
          title="Оборот по текущему фильтру · открыть аналитику"
          style={{
            border: 'none',
            cursor: 'pointer',
            borderRadius: radius.pill,
            padding: '4px 10px',
            backgroundColor: colors.successMuted,
            color: colors.success,
            fontFamily: font.family,
            fontSize: font.sizeXs,
            fontWeight: font.weightSemibold,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          {formatRub(turnoverRub)}
        </button>
      </div>

      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          alignSelf: 'center',
        }}
      >
        <ExpandModeToggle />
        <ToolbarSettingsCluster
          disabled={settingsDisabled}
          onEditView={onEditView}
          parentColumns={parentColumns}
          childColumns={childColumns}
          childGroups={childGroups}
          onParentColumnsSave={onParentColumnsSave}
          onChildColumnsSave={onChildColumnsSave}
        />
      </div>
    </header>
  );
};
