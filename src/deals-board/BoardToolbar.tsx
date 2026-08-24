import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import { currencyToRub, formatRub, type CurrencyAmount } from './analytics/compute';
import { FilterBar } from './FilterBar';
import { ExpandModeToggle } from './ExpandModeToggle';
import { TypeSectionsToggle } from './TypeSectionsToggle';
import { ToolbarSettingsCluster } from './ToolbarSettingsCluster';
import { ViewSwitcher } from './ViewSwitcher';
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
import { countDealsByPrefix, formatPrefixCountsTitle } from './utils/deal-prefix';
import { addSearchTerm } from './utils/search';
import { Input } from './ui/Input';
import { Button } from './ui/Button';

/** Keep typing snappy under Remote DOM — parent filter updates are expensive. */
const SEARCH_COMMIT_DEBOUNCE_MS = 280;

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
  const { colors, font, spacing, radius } = theme;

  const prefixCounts = useMemo(() => countDealsByPrefix(deals), [deals]);
  const turnoverRub = useMemo(
    () =>
      lineItems
        .filter((item) => item.stage !== 'OTMENA')
        .reduce((sum, item) => sum + currencyToRub(item.amount as CurrencyAmount | undefined), 0),
    [lineItems],
  );

  const searchTerms = filterValue.searchTerms ?? [];
  const committedSearch = filterValue.search ?? '';
  const [localSearch, setLocalSearch] = useState(committedSearch);
  const searchFocusedRef = useRef(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterValueRef = useRef(filterValue);
  filterValueRef.current = filterValue;
  const showReset = canResetFilters;

  useEffect(() => {
    // While focused, local draft is the only source of truth. Syncing from parent
    // on delete restores the longer stale value (cursor jumps, text "comes back").
    if (searchFocusedRef.current) return;
    setLocalSearch(committedSearch);
  }, [committedSearch]);

  useEffect(
    () => () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    },
    [],
  );

  const clearSearchTimers = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
  };

  const flushSearchToParent = (next: string) => {
    const current = filterValueRef.current;
    if ((current.search ?? '') === next) return;
    onFilterChange({ ...current, search: next });
  };

  const scheduleSearchCommit = (next: string) => {
    clearSearchTimers();
    searchDebounceRef.current = setTimeout(() => {
      searchDebounceRef.current = null;
      flushSearchToParent(next);
    }, SEARCH_COMMIT_DEBOUNCE_MS);
  };

  const handleFilterResetClick = () => {
    searchFocusedRef.current = false;
    clearSearchTimers();
    setLocalSearch('');
    onFilterReset();
  };

  const commitDraftTerm = () => {
    clearSearchTimers();
    const nextTerms = addSearchTerm(searchTerms, localSearch);
    if (nextTerms.length === searchTerms.length && !localSearch.trim()) return;
    setLocalSearch('');
    onFilterChange({
      ...filterValueRef.current,
      searchTerms: nextTerms,
      search: '',
    });
  };

  const removeTerm = (term: string) => {
    onFilterChange({
      ...filterValueRef.current,
      searchTerms: searchTerms.filter((value) => value.toLowerCase() !== term.toLowerCase()),
    });
  };

  const onSearchChange = (event: ReactChangeEvent<HTMLInputElement>) => {
    const next = event.target.value;
    setLocalSearch(next);
    scheduleSearchCommit(next);
  };

  const onSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitDraftTerm();
      return;
    }
    if (event.key === 'Backspace' && !localSearch && searchTerms.length > 0) {
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
        alignItems: 'center',
        gap: spacing.sm,
        minWidth: 0,
      }}
    >
      <div
        style={{
          flex: '1 1 auto',
          minWidth: 0,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: spacing.sm,
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
          onReset={handleFilterResetClick}
          parentFields={parentFields}
          childFields={childFields}
          layout="compact-top"
        />
        <div
          style={{
            flex: 1,
            minWidth: 180,
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
            type="text"
            value={localSearch}
            onChange={onSearchChange}
            onFocus={() => {
              searchFocusedRef.current = true;
            }}
            onBlur={() => {
              searchFocusedRef.current = false;
              clearSearchTimers();
              flushSearchToParent(localSearch);
            }}
            onKeyDown={onSearchKeyDown}
            placeholder={searchTerms.length > 0 ? 'Ещё слово + Enter…' : 'Поиск…'}
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
          <Button theme={theme} variant="ghost" size="sm" onClick={handleFilterResetClick}>
            Сбросить
          </Button>
        ) : null}
      </div>

      <div
        style={{
          flex: '0 0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: 8,
        }}
      >
        {!isLoading ? (
          <span
            title={formatPrefixCountsTitle(prefixCounts) || undefined}
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
        <button
          type="button"
          onClick={onOpenAnalytics}
          onMouseEnter={(event) => {
            event.currentTarget.style.backgroundColor = colors.bgElevated;
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.backgroundColor = 'transparent';
          }}
          title="Оборот по текущему фильтру · открыть аналитику"
          style={{
            border: 'none',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: radius.sm,
            backgroundColor: 'transparent',
            color: colors.text,
            fontFamily: font.family,
            fontSize: font.sizeSm,
            fontWeight: font.weightSemibold,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
            letterSpacing: '-0.02em',
          }}
        >
          {formatRub(turnoverRub)}
        </button>
        <ExpandModeToggle />
        <TypeSectionsToggle />
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
