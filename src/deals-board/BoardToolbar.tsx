import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent as ReactChangeEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react';

import { BOARD_STREAM } from 'src/constants/product-stream';
import type { BoardStream } from 'src/constants/product-stream';

import { isCrmparserConfigured } from './api/crmparser';
import { formatRub, lineItemSaleRub } from './analytics/compute';
import { BoardRibbon, RibbonTabButtons } from './BoardRibbon';
import { FilterBar } from './FilterBar';
import {
  isLabelsTabAvailable,
  resolveOpenRibbonTab,
  toggleRibbonTab,
  type RibbonTab,
} from './ribbon-state';
import { ViewSwitcher } from './ViewSwitcher';
import { parserLabelsForBoard } from './utils/parser-label-filter';
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
  onLinkDeals?: () => void;
  boardStream?: BoardStream;
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
  onLinkDeals,
  boardStream,
}: BoardToolbarProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;

  const [openTab, setOpenTab] = useState<RibbonTab | null>(null);
  const labelsAvailable = isLabelsTabAvailable(
    parserLabelsForBoard(boardStream ?? BOARD_STREAM.BRANDING).length,
    isCrmparserConfigured(),
  );
  const resolvedOpenTab = resolveOpenRibbonTab(openTab, labelsAvailable);

  const prefixCounts = useMemo(() => countDealsByPrefix(deals), [deals]);
  const turnoverRub = useMemo(
    () => lineItems.reduce((sum, item) => sum + lineItemSaleRub(item), 0),
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
        flexDirection: 'column',
        gap: spacing.xs,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'nowrap',
          alignItems: 'center',
          gap: spacing.sm,
          minWidth: 0,
        }}
      >
        <div
          style={{
            flex: '0 1 auto',
            minWidth: 0,
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            gap: spacing.sm,
            overflowX: 'auto',
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
        </div>
        <div
          style={{
            flex: '1 1 120px',
            minWidth: 120,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            flexWrap: 'nowrap',
            overflowX: 'auto',
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
                flexShrink: 0,
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
              minWidth: 80,
              height: 26,
              padding: '0 4px',
              border: 'none',
              background: 'transparent',
              boxShadow: 'none',
              fontSize: font.sizeSm,
            }}
          />
        </div>
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            flexWrap: 'nowrap',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: 8,
          }}
        >
          {showReset ? (
            <Button theme={theme} variant="ghost" size="sm" onClick={handleFilterResetClick}>
              Сбросить
            </Button>
          ) : null}
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
          <RibbonTabButtons
            openTab={resolvedOpenTab}
            boardStream={boardStream}
            onToggle={(tab) => setOpenTab((current) => toggleRibbonTab(current, tab))}
          />
        </div>
      </div>
      {resolvedOpenTab ? (
        <BoardRibbon
          openTab={resolvedOpenTab}
          boardStream={boardStream}
          settingsDisabled={settingsDisabled}
          onEditView={onEditView}
          parentColumns={parentColumns}
          childColumns={childColumns}
          childGroups={childGroups}
          onParentColumnsSave={onParentColumnsSave}
          onChildColumnsSave={onChildColumnsSave}
          onLinkDeals={onLinkDeals}
        />
      ) : null}
    </header>
  );
};
