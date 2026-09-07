import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_CHILD_COLUMNS,
  DEFAULT_PARENT_COLUMNS,
} from 'src/constants/column-definitions';
import {
  FUTURE_DEALS_VIEW_FILTERS,
  FUTURE_DEALS_VIEW_NAME,
  FUTURE_DEALS_VIEW_SORT,
} from 'src/constants/future-deals-view';
import { MOBILE_VIEW_NAME } from 'src/constants/mobile-view';
import {
  BOARD_STREAM,
  boardStreamToBoardKind,
  filterLineItemsByBoardStream,
  type BoardStream,
} from 'src/constants/product-stream';
import type { LineItemType } from 'src/constants/line-item-types';

import {
  resolveOpportunityLinkFieldDescriptors,
  resolveOpportunityLinkFieldNames,
} from 'src/constants/opportunity-links';
import { resolveOpportunityRestFieldNames } from 'src/constants/opportunity-rest-fields';

import { AnalyticsPanel } from './analytics/AnalyticsPanel';
import { BoardToolbar } from './BoardToolbar';
import { useShouldUseMobileLayout } from './hooks/useShouldUseMobileLayout';
import { useHostHeightLock } from './hooks/useHostHeightLock';
import { DESKTOP_BOARD_HEIGHT_CSS } from './utils/desktop-layout';
import { MobileDealsBoard } from './mobile/MobileDealsBoard';
import { DealsTable } from './DealsTable/DealsTable';
import { ExpandModeProvider } from './hooks/useExpandMode';
import { GroupChipModeProvider } from './hooks/useGroupChipMode';
import { TypeSectionsProvider } from './hooks/useTypeSections';
import { useDealBoardViews, useUpdateDealBoardView } from './hooks/useDealBoardViews';
import { useDealsBoardPage } from './hooks/useDealsBoardPage';
import { useLineItems } from './hooks/useLineItems';
import { usePrefetchLineItemListStatuses } from './hooks/useLineItemListStatus';
import { useShowAllPreference } from './hooks/useShowAllPreference';
import { resolveOpportunitiesFetchAll, useOpportunities } from './hooks/useOpportunities';
import { useOpportunityRashodFields } from './hooks/useOpportunityRashodFields';
import { useDealsBoardEventsSync } from './realtime/useDealsBoardEventsSync';
import { crmFieldNamesFromColumns, fieldTypesByNameFromDescriptors, needsCompanyRelation } from './metadata/crm-field-names';
import { mergeColumns } from './metadata/merge-columns';
import { pinChildColumnFirst } from './utils/pin-child-column';
import { useObjectFields } from './metadata/useObjectFields';
import { VIRTUAL_PARENT_FIELD_DESCRIPTORS } from './metadata/virtual-columns';
import { filterDealsAndLineItems } from './filter-model/apply-line-item-filters';
import {
  hasFilterSessionOverrides,
  RESET_FILTER_SESSION_TO_VIEW,
} from './filter-model/clear-filter-session';
import { clausesToDealBoardFilters } from './filter-model/clauses-to-deal-board-filters';
import { buildPersistedFiltersFromSession } from './filter-model/filter-session-bridge';
import { hasLineItemFilterClauses } from './filter-model/has-line-item-filter-clauses';
import { migrateLegacyFilters } from './filter-model/migrate-legacy-filters';
import { resolveSessionOverride } from './filter-model/resolve-session-override';
import {
  beginSessionClauses,
  commitSessionClauses,
  getEffectiveClauses,
} from './filter-model/session';
import { toggleInClauseValue } from './filter-model/toggle-in-clause';
import type { FilterState } from './filter-model/types';
import { BoardInsightPanel } from './BoardInsightPanel';
import { computeAttention } from './attention/compute';
import type {
  ColumnGroupConfig,
  DealBoardSort,
  DealBoardViewRecord,
  LineItemRow,
  OpportunityRow,
} from './types';
import { getTodayInputDateMsk } from './utils/working-days';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { CancelOtmenaProvider } from './ui/CancelOtmenaPopup';
import { ManualSyncErrorToastProvider } from './ui/ManualSyncErrorToast';
import { OkleykaMessageDialogProvider } from './ui/OkleykaMessageDialog';
import { PortalHostProvider } from './ui/PortalHostContext';
import { DEALS_BOARD_ROOT_ID } from './utils/dom';
import { resolveActiveDealBoardView } from './utils/resolve-active-view';
import { countActiveQuickFilters } from './utils/count-active-quick-filters';
import {
  DESKTOP_PAGE_SIZE,
  MOBILE_MAX_RECORDS,
  MOBILE_PAGE_SIZE,
} from './utils/pagination';
import {
  provisionalAggregateViewId,
  shouldEnableAggregateColdLoad,
} from './utils/aggregate-cold-load-gate';
import { mergeAccumulatedRecords } from './utils/merge-accumulated-records';
import { applyPrintGroupSeed } from './utils/column-groups';
import { asArray } from './utils/parse-json-field';
import { filterLineItemsForSearch, resolveSearchTerms } from './utils/search';
import { ViewSettingsModal } from './ViewSettingsModal';
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

const DealsBoardContent = ({ boardStream }: { boardStream: BoardStream }) => {
  const boardKind = boardStreamToBoardKind(boardStream);
  const theme = useTheme();
  const { colors, font, spacing, layout } = theme;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mobileLayoutActive = useShouldUseMobileLayout(rootRef);
  const lockedHostHeight = useHostHeightLock(rootRef, !mobileLayoutActive);
  const desktopBoardHeight = lockedHostHeight
    ? `${lockedHostHeight}px`
    : DESKTOP_BOARD_HEIGHT_CSS;
  const [accumulatedRecords, setAccumulatedRecords] = useState<OpportunityRow[]>([]);
  const viewsQuery = useDealBoardViews(boardKind);
  const updateViewMutation = useUpdateDealBoardView();
  useDealsBoardEventsSync(!viewsQuery.isLoading);
  const [activeViewId, setActiveViewId] = useState<string>();
  const [page, setPage] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editViewDraft, setEditViewDraft] = useState<DealBoardViewRecord>();
  const [filterSession, setFilterSession] = useState<Partial<FilterState>>({});
  const [sortSession, setSortSession] = useState<DealBoardSort[] | undefined>(undefined);
  const [showAllPositionOppIds, setShowAllPositionOppIds] = useState<Set<string>>(() => new Set());
  const [boardPane, setBoardPane] = useState<'deals' | 'analytics'>('deals');
  const [attentionTip, setAttentionTip] = useState<LineItemType | null>(null);
  const views = asArray<DealBoardViewRecord>(viewsQuery.data);
  const hasPrintGroupMigrationAttemptedRef = useRef(false);

  useEffect(() => {
    if (!viewsQuery.isSuccess || hasPrintGroupMigrationAttemptedRef.current) {
      return;
    }

    const viewsToMigrate = views.filter(
      (view) =>
        (view.name === FUTURE_DEALS_VIEW_NAME || view.name === MOBILE_VIEW_NAME) &&
        view.childGroups.length === 0,
    );
    if (viewsToMigrate.length === 0) {
      return;
    }

    hasPrintGroupMigrationAttemptedRef.current = true;
    for (const view of viewsToMigrate) {
      const seeded = applyPrintGroupSeed(view.childColumns, view.childGroups);
      updateViewMutation.mutate({
        id: view.id,
        data: {
          childColumns: seeded.columns,
          childGroups: seeded.groups,
        },
      });
    }
  }, [updateViewMutation.mutate, views, viewsQuery.isSuccess]);

  const activeView = useMemo(
    () =>
      resolveActiveDealBoardView({
        views,
        activeViewId,
        mobileLayoutActive,
      }),
    [activeViewId, mobileLayoutActive, views],
  );

  const { showAll: showAllPreference, setShowAll: setShowAllPreference } = useShowAllPreference(
    activeView?.id,
  );

  useEffect(() => {
    if (!activeViewId && activeView?.id && !mobileLayoutActive) {
      setActiveViewId(activeView.id);
    }
  }, [activeView?.id, activeViewId, mobileLayoutActive]);

  useEffect(() => {
    setPage(0);
    setAccumulatedRecords([]);
  }, [mobileLayoutActive]);

  useEffect(() => {
    setPage(0);
    setAccumulatedRecords([]);
    setFilterSession({});
    setSortSession(undefined);
    setShowAllPositionOppIds(new Set());
    setAttentionTip(null);
  }, [activeView?.id]);

  const resolvedViewFilters = activeView?.filters ?? FUTURE_DEALS_VIEW_FILTERS;

  const viewClauses = useMemo(
    () => migrateLegacyFilters(resolvedViewFilters),
    [resolvedViewFilters],
  );

  const effectiveClauses = useMemo(
    () => getEffectiveClauses(viewClauses, filterSession.sessionClauses),
    [filterSession.sessionClauses, viewClauses],
  );

  const mergedFilters = useMemo(() => {
    const sessionSearchTerms = resolveSessionOverride(
      filterSession.searchTerms,
      resolvedViewFilters.searchTerms,
    );
    const boardFilters = clausesToDealBoardFilters(
      effectiveClauses,
      resolveSessionOverride(filterSession.datePreset, resolvedViewFilters.datePreset),
      resolveSessionOverride(filterSession.dateFrom, resolvedViewFilters.dateFrom),
      resolveSessionOverride(filterSession.dateTo, resolvedViewFilters.dateTo),
      sessionSearchTerms !== undefined
        ? undefined
        : resolveSessionOverride(filterSession.search, resolvedViewFilters.search),
      sessionSearchTerms,
    );

    return {
      ...boardFilters,
      showAll: showAllPreference,
    };
  }, [
    resolvedViewFilters.dateFrom,
    resolvedViewFilters.datePreset,
    resolvedViewFilters.dateTo,
    resolvedViewFilters.search,
    resolvedViewFilters.searchTerms,
    effectiveClauses,
    filterSession.dateFrom,
    filterSession.datePreset,
    filterSession.dateTo,
    filterSession.search,
    filterSession.searchTerms,
    showAllPreference,
  ]);

  const filterBarValue = useMemo<FilterState>(
    () => ({
      datePreset: resolveSessionOverride(
        filterSession.datePreset,
        activeView?.filters?.datePreset,
      ),
      dateFrom: resolveSessionOverride(filterSession.dateFrom, activeView?.filters?.dateFrom),
      dateTo: resolveSessionOverride(filterSession.dateTo, activeView?.filters?.dateTo),
      search:
        filterSession.search ??
        (filterSession.searchTerms !== undefined ? '' : (activeView?.filters?.search ?? '')),
      searchTerms: resolveSessionOverride(
        filterSession.searchTerms,
        activeView?.filters?.searchTerms,
      ),
      clauses: viewClauses,
      sessionClauses: filterSession.sessionClauses,
    }),
    [activeView?.filters, filterSession, viewClauses],
  );

  const hasLineItemFilters = useMemo(
    () => hasLineItemFilterClauses(effectiveClauses),
    [effectiveClauses],
  );

  const activeFilterCount = countActiveQuickFilters(
    filterSession,
    activeView?.filters ?? {},
    viewClauses,
  );
  const canResetFilters =
    hasFilterSessionOverrides(filterSession) || sortSession !== undefined;

  const persistedViewFilters = useMemo(
    () =>
      activeView
        ? buildPersistedFiltersFromSession(activeView.filters, filterSession, effectiveClauses)
        : undefined,
    [activeView, effectiveClauses, filterSession],
  );

  const effectiveClauseKey = useMemo(
    () =>
      effectiveClauses
        .map((clause) => `${clause.id}:${clause.level}:${clause.field}:${JSON.stringify(clause.value)}`)
        .join('|'),
    [effectiveClauses],
  );

  const effectiveSort = sortSession ?? activeView?.sort ?? FUTURE_DEALS_VIEW_SORT;

  const effectiveSortKey = useMemo(
    () => effectiveSort.map((entry) => `${entry.field}:${entry.direction}`).join('|'),
    [effectiveSort],
  );

  useEffect(() => {
    setPage(0);
  }, [
    activeView?.id,
    filterSession.datePreset,
    filterSession.dateFrom,
    filterSession.dateTo,
    filterSession.search,
    filterSession.searchTerms,
    effectiveClauseKey,
    effectiveSortKey,
  ]);

  const parentFieldsQuery = useObjectFields('opportunity');
  const childFieldsQuery = useObjectFields('dealLineItem');

  const mergedParentColumns = useMemo(
    () =>
      mergeColumns(
        activeView?.parentColumns ?? DEFAULT_PARENT_COLUMNS,
        parentFieldsQuery.data ?? [],
        VIRTUAL_PARENT_FIELD_DESCRIPTORS,
      ),
    [activeView?.parentColumns, parentFieldsQuery.data],
  );

  const mergedChildColumns = useMemo(
    () =>
      pinChildColumnFirst(
        mergeColumns(activeView?.childColumns ?? DEFAULT_CHILD_COLUMNS, childFieldsQuery.data ?? []),
        'prevyuOkleyki',
      ),
    [activeView?.childColumns, childFieldsQuery.data],
  );

  const parentDescriptorByField = useMemo(
    () =>
      new Map(
        [...(parentFieldsQuery.data ?? []), ...VIRTUAL_PARENT_FIELD_DESCRIPTORS].map((descriptor) => [
          descriptor.field,
          descriptor,
        ]),
      ),
    [parentFieldsQuery.data],
  );

  const childDescriptorByField = useMemo(
    () => new Map((childFieldsQuery.data ?? []).map((descriptor) => [descriptor.field, descriptor])),
    [childFieldsQuery.data],
  );

  const visibleParentCrmFields = useMemo(
    () => crmFieldNamesFromColumns(mergedParentColumns, parentFieldsQuery.data ?? []),
    [mergedParentColumns, parentFieldsQuery.data],
  );

  const opportunityRestFieldNames = useMemo(
    () =>
      resolveOpportunityRestFieldNames(
        mergedParentColumns,
        parentFieldsQuery.data ?? [],
      ),
    [mergedParentColumns, parentFieldsQuery.data],
  );

  const opportunityLinkFieldNames = useMemo(
    () => resolveOpportunityLinkFieldNames(mergedParentColumns, parentFieldsQuery.data ?? []),
    [mergedParentColumns, parentFieldsQuery.data],
  );

  const opportunityLinkFields = useMemo(
    () => resolveOpportunityLinkFieldDescriptors(mergedParentColumns, parentFieldsQuery.data ?? []),
    [mergedParentColumns, parentFieldsQuery.data],
  );

  const includeCompanyRelation = useMemo(
    () => needsCompanyRelation(mergedParentColumns),
    [mergedParentColumns],
  );

  const parentFieldTypesByName = useMemo(
    () => fieldTypesByNameFromDescriptors(parentFieldsQuery.data ?? []),
    [parentFieldsQuery.data],
  );

  const showAllDeals = showAllPreference;
  const effectiveShowAll = mobileLayoutActive ? false : showAllDeals;
  const pageSize = mobileLayoutActive ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;

  const lineItemQueryFilters = useMemo(
    () =>
      mergedFilters.stages?.length || mergedFilters.types?.length
        ? { stages: mergedFilters.stages, types: mergedFilters.types }
        : undefined,
    [mergedFilters.stages, mergedFilters.types],
  );

  const fetchAll = resolveOpportunitiesFetchAll({
    filters: mergedFilters,
    sort: effectiveSort,
    showAll: effectiveShowAll,
    forcePaginated: mobileLayoutActive,
    effectiveClauses,
  });
  const useAggregateColdPath = !effectiveShowAll && !fetchAll;

  const baseColdLoadEnabled =
    !viewsQuery.isLoading &&
    !viewsQuery.isSeedingDefault &&
    Boolean(activeView) &&
    !parentFieldsQuery.isLoading;

  // Wait for opportunity field descriptors before aggregate page fetch.
  // Without them mergeColumns drops saved columns → visibleCrmFieldNames=[] and
  // React Query refires 2–3 heavy /s/deals-board/page POSTs as metadata arrives.
  // Still skip isSeedingDefault so seed mutations do not block the first page.
  const parentFieldsReady =
    !parentFieldsQuery.isLoading && Array.isArray(parentFieldsQuery.data);

  const aggregateColdLoadEnabled = shouldEnableAggregateColdLoad({
    useAggregateColdPath,
    viewsIsError: Boolean(viewsQuery.isError),
    parentFieldsReady,
    viewsReady: !viewsQuery.isLoading,
  });

  const opportunitiesQuery = useOpportunities({
    viewId: activeView?.id,
    filters: mergedFilters,
    sort: effectiveSort,
    page: effectiveShowAll ? 0 : page,
    pageSize,
    showAll: effectiveShowAll,
    forcePaginated: mobileLayoutActive,
    visibleCrmFieldNames: visibleParentCrmFields,
    restFieldNames: opportunityRestFieldNames,
    includeCompanyRelation,
    fieldTypesByName: parentFieldTypesByName,
    effectiveClauses,
    enabled: baseColdLoadEnabled && !useAggregateColdPath,
  });

  const dealsBoardPageQuery = useDealsBoardPage({
    viewId: provisionalAggregateViewId(activeView?.id),
    filters: mergedFilters,
    sort: effectiveSort,
    page,
    pageSize,
    visibleCrmFieldNames: visibleParentCrmFields,
    restFieldNames: opportunityRestFieldNames,
    includeCompanyRelation,
    fieldTypesByName: parentFieldTypesByName,
    lineItemFilters: lineItemQueryFilters,
    enabled: aggregateColdLoadEnabled,
  });

  const coldLoadQuery = useAggregateColdPath ? dealsBoardPageQuery : opportunitiesQuery;
  const records = asArray<OpportunityRow>(coldLoadQuery.data?.records);
  const totalCount = coldLoadQuery.data?.totalCount ?? 0;
  const totalPages = effectiveShowAll
    ? 1
    : Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const activeColdLoadLoading = coldLoadQuery.isLoading;

  const lineItemsQuery = useLineItems(
    records.map((record) => record.id),
    lineItemQueryFilters,
    !activeColdLoadLoading && records.length > 0 && !useAggregateColdPath,
  );
  const lineItems = asArray<LineItemRow>(lineItemsQuery.data);
  const streamFilteredLineItems = useMemo(
    () => filterLineItemsByBoardStream(lineItems, boardStream),
    [boardStream, lineItems],
  );

  const lineItemsByOppId = useMemo(() => {
    const grouped: Record<string, LineItemRow[]> = {};
    for (const item of streamFilteredLineItems) {
      (grouped[item.opportunityId] ??= []).push(item);
    }
    return grouped;
  }, [streamFilteredLineItems]);

  const streamFilteredRecords = useMemo(() => {
    if (activeColdLoadLoading || lineItemsQuery.isLoading) {
      return records;
    }

    const oppIdsWithItems = new Set(Object.keys(lineItemsByOppId));
    return records.filter((record) => oppIdsWithItems.has(record.id));
  }, [lineItemsByOppId, activeColdLoadLoading, lineItemsQuery.isLoading, records]);

  const filteredBoardData = useMemo(() => {
    if (!hasLineItemFilters) {
      return {
        deals: streamFilteredRecords,
        lineItemsByOppId,
      };
    }

    return filterDealsAndLineItems({
      deals: streamFilteredRecords,
      lineItemsByOppId,
      clauses: effectiveClauses,
      showAllPositionOppIds,
    });
  }, [
    effectiveClauses,
    hasLineItemFilters,
    lineItemsByOppId,
    showAllPositionOppIds,
    streamFilteredRecords,
  ]);

  const chipVisibilityOppIds = useMemo(
    () => filteredBoardData.deals.map((deal) => deal.id),
    [filteredBoardData.deals],
  );

  // Chip visibility needs every tip on displayed deals. Do not reuse the
  // table's type/stage filters — a PLENKA-only query never returns BANNERA.
  // Enabled on the aggregate path too: page hydrate writes the filtered key,
  // not `filters: undefined`.
  const unfilteredChipLineItemsQuery = useLineItems(
    chipVisibilityOppIds,
    undefined,
    !activeColdLoadLoading && chipVisibilityOppIds.length > 0,
  );
  const unfilteredChipLineItems = asArray<LineItemRow>(unfilteredChipLineItemsQuery.data);
  const unfilteredLineItemsByOppId = useMemo(() => {
    const grouped: Record<string, LineItemRow[]> = {};
    for (const item of filterLineItemsByBoardStream(unfilteredChipLineItems, boardStream)) {
      (grouped[item.opportunityId] ??= []).push(item);
    }
    return grouped;
  }, [boardStream, unfilteredChipLineItems]);

  const allDealLineItemsForChip = useMemo(() => {
    const lists: LineItemRow[] = [];
    for (const deal of filteredBoardData.deals) {
      const unfiltered = unfilteredLineItemsByOppId[deal.id];
      lists.push(
        ...(unfiltered ?? filteredBoardData.lineItemsByOppId[deal.id] ?? []),
      );
    }
    return lists;
  }, [
    filteredBoardData.deals,
    filteredBoardData.lineItemsByOppId,
    unfilteredLineItemsByOppId,
  ]);

  const recordsById = useMemo(
    () => new Map(filteredBoardData.deals.map((record) => [record.id, record])),
    [filteredBoardData.deals],
  );

  const visibleLineItems = useMemo(() => {
    const flat = Object.values(filteredBoardData.lineItemsByOppId).flat();
    const terms = resolveSearchTerms(mergedFilters);
    if (!terms.length) return flat;
    return filterLineItemsForSearch(flat, terms, recordsById);
  }, [
    filteredBoardData.lineItemsByOppId,
    mergedFilters.search,
    mergedFilters.searchTerms,
    recordsById,
  ]);

  const attentionStats = useMemo(() => {
    const oppsById = new Map(streamFilteredRecords.map((record) => [record.id, record]));
    return computeAttention(getTodayInputDateMsk(), streamFilteredLineItems, oppsById);
  }, [streamFilteredLineItems, streamFilteredRecords]);

  const attentionHighlightOppIds = useMemo(() => {
    if (!attentionTip) return null;
    const ids = new Set<string>();
    for (const item of attentionStats.items) {
      if (item.tip === attentionTip) ids.add(item.opportunityId);
    }
    return ids;
  }, [attentionStats.items, attentionTip]);

  const tableRecords = useMemo(() => {
    if (!attentionHighlightOppIds) return filteredBoardData.deals;
    return streamFilteredRecords.filter((deal) => attentionHighlightOppIds.has(deal.id));
  }, [attentionHighlightOppIds, filteredBoardData.deals, streamFilteredRecords]);

  const tableLineItems = useMemo(() => {
    if (!attentionTip) return visibleLineItems;
    const lineIds = new Set(
      attentionStats.items
        .filter((item) => item.tip === attentionTip)
        .map((item) => item.lineItemId),
    );
    return streamFilteredLineItems.filter((item) => lineIds.has(item.id));
  }, [attentionStats.items, attentionTip, streamFilteredLineItems, visibleLineItems]);

  const visibleRecords = tableRecords;
  const visibleTotalCount = attentionTip
    ? tableRecords.length
    : hasLineItemFilters
      ? filteredBoardData.deals.length
      : totalCount;
  const rashodQuery = useOpportunityRashodFields(
    visibleRecords,
    boardPane === 'analytics',
  );

  const handleFilterBarChange = (next: FilterState) => {
    setFilterSession({
      sessionClauses: next.sessionClauses,
      datePreset: next.datePreset,
      dateFrom: next.dateFrom,
      dateTo: next.dateTo,
      search: next.search,
      searchTerms: next.searchTerms,
    });
  };

  const toggleScoreboardClause = (field: 'tip' | 'stage', optionValue: string) => {
    const base =
      filterSession.sessionClauses === undefined
        ? beginSessionClauses(viewClauses)
        : filterSession.sessionClauses;
    setFilterSession({
      ...filterSession,
      sessionClauses: commitSessionClauses(
        toggleInClauseValue(base, 'lineItem', field, optionValue),
      ),
    });
  };

  const handleFilterReset = () => {
    // Restore the active view's saved filters (drop session overrides).
    setFilterSession(RESET_FILTER_SESSION_TO_VIEW);
    setSortSession(undefined);
    setShowAllPositionOppIds(new Set());
    setAttentionTip(null);
  };

  const handleSortChange = (next: DealBoardSort[]) => {
    setSortSession(next);
    setPage(0);
  };

  const handleToggleShowAllPositions = useCallback((opportunityId: string) => {
    setShowAllPositionOppIds((prev) => {
      const next = new Set(prev);
      if (next.has(opportunityId)) {
        next.delete(opportunityId);
      } else {
        next.add(opportunityId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (effectiveShowAll) {
      setAccumulatedRecords(visibleRecords);
      return;
    }
    if (page === 0) {
      setAccumulatedRecords(visibleRecords);
      return;
    }
    setAccumulatedRecords((prev) =>
      mergeAccumulatedRecords(prev, visibleRecords, {
        maxLength: mobileLayoutActive ? MOBILE_MAX_RECORDS : undefined,
      }),
    );
  }, [effectiveShowAll, mobileLayoutActive, page, visibleRecords]);

  const mobileRecords = !effectiveShowAll ? accumulatedRecords : visibleRecords;

  const mobileLineItemsQuery = useLineItems(
    mobileLayoutActive ? mobileRecords.map((record) => record.id) : [],
    lineItemQueryFilters,
    mobileLayoutActive &&
      mobileRecords.length > 0 &&
      !activeColdLoadLoading &&
      !useAggregateColdPath,
  );
  const mobileLineItems = asArray<LineItemRow>(mobileLineItemsQuery.data);
  const streamFilteredMobileLineItems = useMemo(
    () => filterLineItemsByBoardStream(mobileLineItems, boardStream),
    [boardStream, mobileLineItems],
  );

  const displayLineItems = useMemo(() => {
    if (!mobileLayoutActive) return visibleLineItems;

    const sourceItems =
      streamFilteredMobileLineItems.length > 0 ? streamFilteredMobileLineItems : streamFilteredLineItems;
    let scoped = sourceItems;

    if (hasLineItemFilters) {
      const mobileLineItemsByOppId: Record<string, LineItemRow[]> = {};
      for (const item of sourceItems) {
        (mobileLineItemsByOppId[item.opportunityId] ??= []).push(item);
      }
      scoped = Object.values(
        filterDealsAndLineItems({
          deals: mobileRecords,
          lineItemsByOppId: mobileLineItemsByOppId,
          clauses: effectiveClauses,
          showAllPositionOppIds,
        }).lineItemsByOppId,
      ).flat();
    }

    const terms = resolveSearchTerms(mergedFilters);
    if (!terms.length) return scoped;
    const recordsByMobileId = new Map(mobileRecords.map((record) => [record.id, record]));
    return filterLineItemsForSearch(scoped, terms, recordsByMobileId);
  }, [
    effectiveClauses,
    hasLineItemFilters,
    mobileLayoutActive,
    mergedFilters.search,
    mergedFilters.searchTerms,
    streamFilteredLineItems,
    streamFilteredMobileLineItems,
    mobileRecords,
    showAllPositionOppIds,
    visibleLineItems,
  ]);

  const listStatusLineItemIds = useMemo(
    () => displayLineItems.map((item) => item.id).filter(Boolean),
    [displayLineItems],
  );
  usePrefetchLineItemListStatuses(
    listStatusLineItemIds,
    listStatusLineItemIds.length > 0 && !activeColdLoadLoading,
  );

  const loadError = viewsQuery.error ?? coldLoadQuery.error ?? null;
  const metadataFieldsError =
    parentFieldsQuery.error ?? childFieldsQuery.error ?? null;
  const metadataFieldsWarning = metadataFieldsError
    ? `Не удалось обновить список полей — используются сохранённые колонки${
        metadataFieldsError instanceof Error ? `: ${metadataFieldsError.message}` : ''
      }`
    : undefined;
  const lineItemsWarning =
    lineItemsQuery.error instanceof Error
      ? lineItemsQuery.error.message
      : lineItemsQuery.error
        ? String(lineItemsQuery.error)
        : undefined;

  const saveActiveViewColumns = async (
    target: 'parent' | 'child',
    columns: DealBoardViewRecord['parentColumns'],
    groups: ColumnGroupConfig[] = [],
  ) => {
    if (!activeView) return;

    try {
      await updateViewMutation.mutateAsync({
        id: activeView.id,
        data:
          target === 'parent'
            ? { parentColumns: columns }
            : { childColumns: columns, childGroups: groups },
      });
    } catch (error) {
      window.alert(
        `Не удалось обновить колонки view.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
      throw error;
    }
  };

  const handleShowAllChange = (nextShowAll: boolean) => {
    setShowAllPreference(nextShowAll);
    setPage(0);
  };

  return (
    <PortalHostProvider hostRef={rootRef}>
      <CancelOtmenaProvider>
      <ManualSyncErrorToastProvider>
      <OkleykaMessageDialogProvider>
      <div
        ref={rootRef}
        id={DEALS_BOARD_ROOT_ID}
        data-deals-board
        data-mobile-layout={mobileLayoutActive ? '' : undefined}
        data-desktop-layout={mobileLayoutActive ? undefined : ''}
        style={{
          position: 'relative',
          height: mobileLayoutActive ? 'auto' : desktopBoardHeight,
          maxHeight: mobileLayoutActive ? 'none' : desktopBoardHeight,
          minHeight: 0,
          display: mobileLayoutActive ? 'block' : 'flex',
          flexDirection: mobileLayoutActive ? undefined : 'column',
          overflow: mobileLayoutActive ? 'visible' : 'hidden',
          backgroundColor: colors.bg,
          color: colors.text,
          fontFamily: font.family,
          fontSize: font.sizeSm,
        }}
      >
      {mobileLayoutActive ? (
        <>
      {metadataFieldsWarning ? (
        <div
          style={{
            padding: `${spacing.xs} ${spacing.md}`,
            fontSize: font.sizeSm,
            color: colors.warning,
            backgroundColor: colors.warningMuted,
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}
        >
          {metadataFieldsWarning}
        </div>
      ) : null}

      {lineItemsWarning ? (
        <div
          style={{
            padding: `${spacing.xs} ${spacing.md}`,
            fontSize: font.sizeSm,
            color: colors.warning,
            backgroundColor: colors.warningMuted,
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}
        >
          Позиции сделок не загрузились: {lineItemsWarning}
        </div>
      ) : null}

        <MobileDealsBoard
          activeView={activeView}
          views={views}
          parentColumns={mergedParentColumns}
          childColumns={mergedChildColumns}
          childGroups={activeView?.childGroups ?? []}
          parentDescriptorByField={parentDescriptorByField}
          childDescriptorByField={childDescriptorByField}
          opportunityLinkFields={opportunityLinkFields}
          records={mobileRecords}
          lineItems={displayLineItems}
          allDealLineItems={allDealLineItemsForChip}
          boardStream={boardStream}
          lineItemFilters={lineItemQueryFilters}
          totalCount={visibleTotalCount}
          page={page}
          totalPages={totalPages}
          showAll={effectiveShowAll}
          maxRecordsReached={mobileRecords.length >= MOBILE_MAX_RECORDS}
          activeFilterCount={activeFilterCount}
          filterValue={filterBarValue}
          viewClauses={viewClauses}
          onFilterChange={handleFilterBarChange}
          onFilterReset={handleFilterReset}
          onPageChange={setPage}
          onSelectView={setActiveViewId}
          onCreateView={() => setIsCreateModalOpen(true)}
          onEditView={() => {
            if (activeView) setEditViewDraft(activeView);
          }}
          onParentColumnsSave={(columns) => saveActiveViewColumns('parent', columns)}
          onChildColumnsSave={(columns, groups) =>
            saveActiveViewColumns('child', columns, groups)
          }
          onResetFilters={handleFilterReset}
          isLoading={coldLoadQuery.isLoading}
          isViewLoading={viewsQuery.isLoading || viewsQuery.isSeedingDefault}
          errorMessage={
            loadError instanceof Error ? loadError.message : loadError ? String(loadError) : undefined
          }
        />
        </>
      ) : (
        <>
          <BoardToolbar
            views={views}
            activeViewId={activeView?.id}
            onSelectView={setActiveViewId}
            onCreateView={() => setIsCreateModalOpen(true)}
            filterValue={filterBarValue}
            viewClauses={viewClauses}
            onFilterChange={handleFilterBarChange}
            onFilterReset={handleFilterReset}
            parentFields={parentFieldsQuery.data ?? []}
            childFields={childFieldsQuery.data ?? []}
            deals={filteredBoardData.deals}
            lineItems={visibleLineItems}
            dealCount={visibleTotalCount}
            isLoading={coldLoadQuery.isLoading}
            onOpenAnalytics={() => setBoardPane('analytics')}
            settingsDisabled={!activeView}
            onEditView={() => {
              if (activeView) setEditViewDraft(activeView);
            }}
            parentColumns={mergedParentColumns}
            childColumns={mergedChildColumns}
            childGroups={activeView?.childGroups ?? []}
            onParentColumnsSave={(columns) => saveActiveViewColumns('parent', columns)}
            onChildColumnsSave={(columns, groups) =>
              saveActiveViewColumns('child', columns, groups)
            }
            activeFilterCount={activeFilterCount}
            canResetFilters={canResetFilters}
          />

          {metadataFieldsWarning ? (
            <div
              style={{
                padding: `${spacing.xs} ${spacing.md}`,
                fontSize: font.sizeSm,
                color: colors.warning,
                backgroundColor: colors.warningMuted,
                borderBottom: `1px solid ${colors.border}`,
                flexShrink: 0,
              }}
            >
              {metadataFieldsWarning}
            </div>
          ) : null}

          {lineItemsWarning ? (
            <div
              style={{
                padding: `${spacing.xs} ${spacing.md}`,
                fontSize: font.sizeSm,
                color: colors.warning,
                backgroundColor: colors.warningMuted,
                borderBottom: `1px solid ${colors.border}`,
                flexShrink: 0,
              }}
            >
              Позиции сделок не загрузились: {lineItemsWarning}
            </div>
          ) : null}

          <BoardInsightPanel
            lineItems={visibleLineItems}
            deals={filteredBoardData.deals}
            selectedTypes={mergedFilters.types ?? []}
            onToggleType={(tip) => toggleScoreboardClause('tip', tip)}
            attentionStats={attentionStats}
            attentionTip={attentionTip}
            onToggleAttentionTip={(tip) =>
              setAttentionTip((current) => (current === tip ? null : tip))
            }
            summaryTitle={
              filterBarValue.datePreset === 'today'
                ? 'Сводка на сегодня'
                : filterBarValue.datePreset === 'tomorrow'
                  ? 'Сводка на завтра'
                  : filterBarValue.datePreset === 'dayAfterTomorrow'
                    ? 'Сводка на послезавтра'
                    : filterBarValue.datePreset === 'week'
                      ? 'Сводка на неделю'
                      : filterBarValue.datePreset === 'month'
                        ? 'Сводка на месяц'
                        : 'Сводка'
            }
          />

          {boardPane === 'analytics' ? (
            <div
              data-deals-board-body
              style={{
                minHeight: 0,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <AnalyticsPanel
                opportunities={rashodQuery.opportunities}
                lineItems={visibleLineItems}
                onBack={() => setBoardPane('deals')}
              />
            </div>
          ) : (
          <div
            data-deals-board-body
            style={{
              minHeight: 0,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <DealsTable
              activeView={activeView}
              parentColumns={mergedParentColumns}
              childColumns={mergedChildColumns}
              childGroups={activeView?.childGroups ?? []}
              parentDescriptorByField={parentDescriptorByField}
              childDescriptorByField={childDescriptorByField}
              opportunityLinkFields={opportunityLinkFields}
              records={visibleRecords}
              lineItems={tableLineItems}
              allDealLineItems={allDealLineItemsForChip}
              lineItemFilters={lineItemQueryFilters}
              hasLineItemFilters={hasLineItemFilters}
              showAllPositionOppIds={showAllPositionOppIds}
              onToggleShowAllPositions={handleToggleShowAllPositions}
              attentionOpportunityIds={attentionHighlightOppIds}
              boardStream={boardStream}
              totalCount={visibleTotalCount}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              onResetFilters={handleFilterReset}
              onParentColumnsSave={(columns) => saveActiveViewColumns('parent', columns)}
              onChildColumnsSave={(columns) =>
                saveActiveViewColumns('child', columns, activeView?.childGroups ?? [])
              }
              showAll={showAllDeals}
              onShowAllChange={handleShowAllChange}
              sort={effectiveSort}
              onSortChange={handleSortChange}
              isLoading={coldLoadQuery.isLoading}
              isViewLoading={viewsQuery.isLoading || viewsQuery.isSeedingDefault}
              errorMessage={
                loadError instanceof Error ? loadError.message : loadError ? String(loadError) : undefined
              }
            />
          </div>
          )}
        </>
      )}

      <ViewSettingsModal
        isOpen={isCreateModalOpen}
        boardKind={boardKind}
        filtersToPersist={persistedViewFilters}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={(view) => setActiveViewId(view.id)}
      />

      <ViewSettingsModal
        isOpen={Boolean(editViewDraft)}
        boardKind={boardKind}
        initialView={editViewDraft}
        filtersToPersist={persistedViewFilters}
        onClose={() => setEditViewDraft(undefined)}
        onSaved={(view) => setActiveViewId(view.id)}
      />
    </div>
      </OkleykaMessageDialogProvider>
      </ManualSyncErrorToastProvider>
      </CancelOtmenaProvider>
    </PortalHostProvider>
  );
};

export const DealsBoard = ({
  boardStream = BOARD_STREAM.BRANDING,
}: {
  boardStream?: BoardStream;
} = {}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ExpandModeProvider>
          <TypeSectionsProvider>
            <GroupChipModeProvider>
              <DealsBoardContent boardStream={boardStream} />
            </GroupChipModeProvider>
          </TypeSectionsProvider>
        </ExpandModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
