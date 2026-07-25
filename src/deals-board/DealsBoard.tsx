import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_CHILD_COLUMNS,
  DEFAULT_PARENT_COLUMNS,
} from 'src/constants/column-definitions';
import { FUTURE_DEALS_VIEW_NAME } from 'src/constants/future-deals-view';
import { MOBILE_VIEW_NAME } from 'src/constants/mobile-view';
import { APP_DISPLAY_NAME } from 'src/constants/universal-identifiers';

import {
  resolveOpportunityLinkFieldDescriptors,
  resolveOpportunityLinkFieldNames,
} from 'src/constants/opportunity-links';
import { resolveOpportunityRestFieldNames } from 'src/constants/opportunity-rest-fields';
import { OPPORTUNITY_RASHOD_REST_FIELDS } from 'src/constants/opportunity-rashod-fields';

import { AnalyticsPanel } from './analytics/AnalyticsPanel';
import { MarginStrip } from './analytics/MarginStrip';
import { useShouldUseMobileLayout } from './hooks/useShouldUseMobileLayout';
import { useHostHeightLock } from './hooks/useHostHeightLock';
import { DESKTOP_BOARD_HEIGHT_CSS } from './utils/desktop-layout';
import { MobileDealsBoard } from './mobile/MobileDealsBoard';
import { ToolbarSettingsCluster } from './ToolbarSettingsCluster';
import { DealsTable } from './DealsTable/DealsTable';
import { ExpandModeToggle } from './ExpandModeToggle';
import { GroupChipModeToggle } from './GroupChipModeToggle';
import { ExpandModeProvider } from './hooks/useExpandMode';
import { GroupChipModeProvider } from './hooks/useGroupChipMode';
import { useDealBoardViews, useUpdateDealBoardView } from './hooks/useDealBoardViews';
import { useLineItems } from './hooks/useLineItems';
import { useOpportunities } from './hooks/useOpportunities';
import { useDealsBoardRealtimeSync } from './realtime/useDealsBoardRealtimeSync';
import { crmFieldNamesFromColumns, fieldTypesByNameFromDescriptors, needsCompanyRelation } from './metadata/crm-field-names';
import { mergeColumns } from './metadata/merge-columns';
import { useObjectFields } from './metadata/useObjectFields';
import { VIRTUAL_PARENT_FIELD_DESCRIPTORS } from './metadata/virtual-columns';
import { FilterBar } from './FilterBar';
import { filterDealsAndLineItems } from './filter-model/apply-line-item-filters';
import { clausesToDealBoardFilters } from './filter-model/clauses-to-deal-board-filters';
import {
  buildPersistedFiltersFromSession,
  buildPersistedViewFilters,
} from './filter-model/filter-session-bridge';
import { hasLineItemFilterClauses } from './filter-model/has-line-item-filter-clauses';
import { migrateLegacyFilters } from './filter-model/migrate-legacy-filters';
import {
  beginSessionClauses,
  commitSessionClauses,
  getEffectiveClauses,
} from './filter-model/session';
import { toggleInClauseValue } from './filter-model/toggle-in-clause';
import type { FilterState } from './filter-model/types';
import { ProductionScoreboard } from './scoreboard/ProductionScoreboard';
import type {
  ColumnGroupConfig,
  DealBoardSort,
  DealBoardViewRecord,
  LineItemRow,
  OpportunityRow,
} from './types';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { CancelOtmenaProvider } from './ui/CancelOtmenaPopup';
import { ManualSyncErrorToastProvider } from './ui/ManualSyncErrorToast';
import { OkleykaMessageToastProvider } from './ui/OkleykaMessageToast';
import { PortalHostProvider } from './ui/PortalHostContext';
import { DEALS_BOARD_ROOT_ID } from './utils/dom';
import { resolveActiveDealBoardView } from './utils/resolve-active-view';
import { countActiveQuickFilters } from './utils/count-active-quick-filters';
import {
  DESKTOP_PAGE_SIZE,
  MOBILE_MAX_RECORDS,
  MOBILE_PAGE_SIZE,
} from './utils/pagination';
import { applyPrintGroupSeed } from './utils/column-groups';
import { asArray } from './utils/parse-json-field';
import { filterLineItemsForSearch, normalizeSearchTerm } from './utils/search';
import { ViewSettingsModal } from './ViewSettingsModal';
import { ViewSwitcher } from './ViewSwitcher';

const queryClient = new QueryClient();

const EMPTY_FILTER_SESSION: Partial<FilterState> = {};

const DealsBoardContent = () => {
  const theme = useTheme();
  const { colors, font, spacing, radius, layout } = theme;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const mobileLayoutActive = useShouldUseMobileLayout(rootRef);
  const lockedHostHeight = useHostHeightLock(rootRef, !mobileLayoutActive);
  const desktopBoardHeight = lockedHostHeight
    ? `${lockedHostHeight}px`
    : DESKTOP_BOARD_HEIGHT_CSS;
  const [accumulatedRecords, setAccumulatedRecords] = useState<OpportunityRow[]>([]);
  const viewsQuery = useDealBoardViews();
  const updateViewMutation = useUpdateDealBoardView();
  useDealsBoardRealtimeSync(!viewsQuery.isLoading);
  const [activeViewId, setActiveViewId] = useState<string>();
  const [page, setPage] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editViewDraft, setEditViewDraft] = useState<DealBoardViewRecord>();
  const [filterSession, setFilterSession] = useState<Partial<FilterState>>(EMPTY_FILTER_SESSION);
  const [sortSession, setSortSession] = useState<DealBoardSort[] | undefined>(undefined);
  const [showAllPositionOppIds, setShowAllPositionOppIds] = useState<Set<string>>(() => new Set());
  const [boardPane, setBoardPane] = useState<'deals' | 'analytics'>('deals');
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
    setFilterSession(EMPTY_FILTER_SESSION);
    setSortSession(undefined);
    setShowAllPositionOppIds(new Set());
  }, [activeView?.id]);

  const viewClauses = useMemo(
    () => migrateLegacyFilters(activeView?.filters ?? {}),
    [activeView?.filters],
  );

  const effectiveClauses = useMemo(
    () => getEffectiveClauses(viewClauses, filterSession.sessionClauses),
    [filterSession.sessionClauses, viewClauses],
  );

  const mergedFilters = useMemo(() => {
    const boardFilters = clausesToDealBoardFilters(
      effectiveClauses,
      filterSession.datePreset ?? activeView?.filters?.datePreset,
      filterSession.dateFrom ?? activeView?.filters?.dateFrom,
      filterSession.dateTo ?? activeView?.filters?.dateTo,
      filterSession.search ?? activeView?.filters?.search,
    );

    return {
      ...boardFilters,
      showAll: activeView?.filters?.showAll,
    };
  }, [
    activeView?.filters?.dateFrom,
    activeView?.filters?.datePreset,
    activeView?.filters?.dateTo,
    activeView?.filters?.search,
    activeView?.filters?.showAll,
    effectiveClauses,
    filterSession.dateFrom,
    filterSession.datePreset,
    filterSession.dateTo,
    filterSession.search,
  ]);

  const filterBarValue = useMemo<FilterState>(
    () => ({
      datePreset: filterSession.datePreset ?? activeView?.filters?.datePreset,
      dateFrom: filterSession.dateFrom ?? activeView?.filters?.dateFrom,
      dateTo: filterSession.dateTo ?? activeView?.filters?.dateTo,
      search: filterSession.search ?? activeView?.filters?.search ?? '',
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

  const effectiveSort = sortSession ?? activeView?.sort ?? [];

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
      mergeColumns(activeView?.childColumns ?? DEFAULT_CHILD_COLUMNS, childFieldsQuery.data ?? []),
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

  const opportunityRestFieldNames = useMemo(() => {
    const fromColumns = resolveOpportunityRestFieldNames(
      mergedParentColumns,
      parentFieldsQuery.data ?? [],
    );
    return [...new Set([...fromColumns, ...OPPORTUNITY_RASHOD_REST_FIELDS])];
  }, [mergedParentColumns, parentFieldsQuery.data]);

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

  const showAllDeals = activeView?.filters?.showAll ?? false;
  const effectiveShowAll = mobileLayoutActive ? false : showAllDeals;
  const pageSize = mobileLayoutActive ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;

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
    enabled:
      !viewsQuery.isLoading &&
      !viewsQuery.isSeedingDefault &&
      Boolean(activeView) &&
      !parentFieldsQuery.isLoading,
  });

  const records = asArray<OpportunityRow>(opportunitiesQuery.data?.records);
  const totalCount = opportunitiesQuery.data?.totalCount ?? 0;
  const totalPages = effectiveShowAll
    ? 1
    : Math.max(1, Math.ceil(totalCount / pageSize));

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const lineItemQueryFilters = useMemo(
    () =>
      mergedFilters.stages?.length || mergedFilters.types?.length
        ? { stages: mergedFilters.stages, types: mergedFilters.types }
        : undefined,
    [mergedFilters.stages, mergedFilters.types],
  );

  const lineItemsQuery = useLineItems(
    records.map((record) => record.id),
    lineItemQueryFilters,
    !opportunitiesQuery.isLoading,
  );
  const lineItems = asArray<LineItemRow>(lineItemsQuery.data);

  const lineItemsByOppId = useMemo(() => {
    const grouped: Record<string, LineItemRow[]> = {};
    for (const item of lineItems) {
      (grouped[item.opportunityId] ??= []).push(item);
    }
    return grouped;
  }, [lineItems]);

  const filteredBoardData = useMemo(() => {
    if (!hasLineItemFilters) {
      return {
        deals: records,
        lineItemsByOppId,
      };
    }

    return filterDealsAndLineItems({
      deals: records,
      lineItemsByOppId,
      clauses: effectiveClauses,
      showAllPositionOppIds,
    });
  }, [effectiveClauses, hasLineItemFilters, lineItemsByOppId, records, showAllPositionOppIds]);

  const recordsById = useMemo(
    () => new Map(filteredBoardData.deals.map((record) => [record.id, record])),
    [filteredBoardData.deals],
  );

  const visibleLineItems = useMemo(() => {
    const flat = Object.values(filteredBoardData.lineItemsByOppId).flat();
    const search = normalizeSearchTerm(mergedFilters.search);
    if (!search) return flat;
    return filterLineItemsForSearch(flat, search, recordsById);
  }, [filteredBoardData.lineItemsByOppId, mergedFilters.search, recordsById]);

  const visibleRecords = filteredBoardData.deals;
  const visibleTotalCount = hasLineItemFilters ? visibleRecords.length : totalCount;

  const handleFilterBarChange = (next: FilterState) => {
    setFilterSession({
      sessionClauses: next.sessionClauses,
      datePreset: next.datePreset,
      dateFrom: next.dateFrom,
      dateTo: next.dateTo,
      search: next.search,
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
    setFilterSession(EMPTY_FILTER_SESSION);
    setSortSession(undefined);
    setShowAllPositionOppIds(new Set());
  };

  const handleSortChange = (next: DealBoardSort[]) => {
    setSortSession(next);
    setPage(0);
  };

  const handleToggleShowAllPositions = (opportunityId: string) => {
    setShowAllPositionOppIds((prev) => {
      const next = new Set(prev);
      if (next.has(opportunityId)) {
        next.delete(opportunityId);
      } else {
        next.add(opportunityId);
      }
      return next;
    });
  };

  useEffect(() => {
    if (effectiveShowAll) {
      setAccumulatedRecords(visibleRecords);
      return;
    }
    if (page === 0) {
      setAccumulatedRecords(visibleRecords);
      return;
    }
    setAccumulatedRecords((prev) => {
      const seen = new Set(prev.map((record) => record.id));
      const merged = [...prev];
      for (const record of visibleRecords) {
        if (!seen.has(record.id)) merged.push(record);
      }
      if (mobileLayoutActive && merged.length > MOBILE_MAX_RECORDS) {
        return merged.slice(0, MOBILE_MAX_RECORDS);
      }
      return merged;
    });
  }, [effectiveShowAll, mobileLayoutActive, page, visibleRecords]);

  const mobileRecords = !effectiveShowAll ? accumulatedRecords : visibleRecords;

  const mobileLineItemsQuery = useLineItems(
    mobileLayoutActive ? mobileRecords.map((record) => record.id) : [],
    lineItemQueryFilters,
    mobileLayoutActive && mobileRecords.length > 0 && !opportunitiesQuery.isLoading,
  );
  const mobileLineItems = asArray<LineItemRow>(mobileLineItemsQuery.data);

  const displayLineItems = useMemo(() => {
    if (!mobileLayoutActive) return visibleLineItems;

    const sourceItems = mobileLineItems.length > 0 ? mobileLineItems : lineItems;
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

    const search = normalizeSearchTerm(mergedFilters.search);
    if (!search) return scoped;
    const recordsByMobileId = new Map(mobileRecords.map((record) => [record.id, record]));
    return filterLineItemsForSearch(scoped, search, recordsByMobileId);
  }, [
    effectiveClauses,
    hasLineItemFilters,
    lineItems,
    mobileLayoutActive,
    mobileLineItems,
    mobileRecords,
    mergedFilters.search,
    showAllPositionOppIds,
    visibleLineItems,
  ]);

  const loadError = viewsQuery.error ?? opportunitiesQuery.error ?? null;
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

  const handleShowAllChange = async (nextShowAll: boolean) => {
    if (!activeView) return;

    try {
      await updateViewMutation.mutateAsync({
        id: activeView.id,
        data: {
          filters: buildPersistedViewFilters(activeView.filters, {
            showAll: nextShowAll,
          }),
        },
      });
      setPage(0);
    } catch (error) {
      window.alert(
        `Не удалось обновить настройку пагинации.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  return (
    <PortalHostProvider hostRef={rootRef}>
      <CancelOtmenaProvider>
      <ManualSyncErrorToastProvider>
      <OkleykaMessageToastProvider>
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
          isLoading={opportunitiesQuery.isLoading}
          isViewLoading={viewsQuery.isLoading || viewsQuery.isSeedingDefault}
          errorMessage={
            loadError instanceof Error ? loadError.message : loadError ? String(loadError) : undefined
          }
        />
        </>
      ) : (
        <>
          <div data-deals-board-toolbar>
            <header
              style={{
                borderBottom: `1px solid ${colors.borderSubtle}`,
                backgroundColor: 'transparent',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.sm} ${spacing.md}`,
                  minHeight: layout.toolbarHeight,
                  flexWrap: 'wrap',
                }}
              >
                <ViewSwitcher
                  views={views}
                  activeViewId={activeView?.id}
                  onSelectView={setActiveViewId}
                  onCreateView={() => setIsCreateModalOpen(true)}
                />

                <div
                  style={{
                    width: '1px',
                    alignSelf: 'stretch',
                    backgroundColor: colors.borderSubtle,
                    flexShrink: 0,
                    minHeight: '28px',
                  }}
                />

                <FilterBar
                  value={filterBarValue}
                  viewClauses={viewClauses}
                  onChange={handleFilterBarChange}
                  onReset={handleFilterReset}
                  parentFields={parentFieldsQuery.data ?? []}
                  childFields={childFieldsQuery.data ?? []}
                />

                <div
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    flexShrink: 0,
                    minWidth: 0,
                  }}
                >
                  <MarginStrip
                    opportunities={visibleRecords}
                    lineItems={visibleLineItems}
                    onOpenAnalytics={() => setBoardPane('analytics')}
                  />
                  <ExpandModeToggle />
                  <GroupChipModeToggle />
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: spacing.md,
                  padding: `6px ${spacing.md}`,
                  borderTop: `1px solid ${colors.borderSubtle}`,
                  minHeight: '32px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0 }}>
                  <span
                    style={{
                      fontSize: font.sizeSm,
                      fontWeight: font.weightSemibold,
                      color: colors.text,
                      letterSpacing: '-0.02em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {APP_DISPLAY_NAME}
                  </span>
                  {activeView ? (
                    <>
                      <span style={{ color: colors.textMuted, fontSize: font.sizeXs }}>/</span>
                      <span
                        style={{
                          fontSize: font.sizeSm,
                          color: colors.textSecondary,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {activeView.name}
                      </span>
                      {!opportunitiesQuery.isLoading ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '1px 7px',
                            borderRadius: radius.pill,
                            fontSize: font.sizeXs,
                            fontWeight: font.weightMedium,
                            fontFamily: font.mono,
                            color: colors.textMuted,
                            backgroundColor: colors.bgTertiary,
                            border: `1px solid ${colors.borderSubtle}`,
                            flexShrink: 0,
                          }}
                        >
                          {visibleTotalCount}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>

                <ToolbarSettingsCluster
                  disabled={!activeView}
                  onEditView={() => {
                    if (activeView) {
                      setEditViewDraft(activeView);
                    }
                  }}
                  parentColumns={mergedParentColumns}
                  childColumns={mergedChildColumns}
                  childGroups={activeView?.childGroups ?? []}
                  onParentColumnsSave={(columns) => saveActiveViewColumns('parent', columns)}
                  onChildColumnsSave={(columns, groups) =>
                    saveActiveViewColumns('child', columns, groups)
                  }
                />
              </div>
            </header>

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
          </div>

          <ProductionScoreboard
            lineItems={visibleLineItems}
            selectedTypes={mergedFilters.types ?? []}
            selectedStages={mergedFilters.stages ?? []}
            onToggleType={(tip) => toggleScoreboardClause('tip', tip)}
            onToggleStage={(stage) => toggleScoreboardClause('stage', stage)}
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
                opportunities={visibleRecords}
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
              lineItems={visibleLineItems}
              lineItemFilters={lineItemQueryFilters}
              hasLineItemFilters={hasLineItemFilters}
              showAllPositionOppIds={showAllPositionOppIds}
              onToggleShowAllPositions={handleToggleShowAllPositions}
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
              onShowAllChange={(nextShowAll) => void handleShowAllChange(nextShowAll)}
              sort={effectiveSort}
              onSortChange={handleSortChange}
              isLoading={opportunitiesQuery.isLoading}
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
        filtersToPersist={persistedViewFilters}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={(view) => setActiveViewId(view.id)}
      />

      <ViewSettingsModal
        isOpen={Boolean(editViewDraft)}
        initialView={editViewDraft}
        filtersToPersist={persistedViewFilters}
        onClose={() => setEditViewDraft(undefined)}
        onSaved={(view) => setActiveViewId(view.id)}
      />
    </div>
      </OkleykaMessageToastProvider>
      </ManualSyncErrorToastProvider>
      </CancelOtmenaProvider>
    </PortalHostProvider>
  );
};

export const DealsBoard = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ExpandModeProvider>
          <GroupChipModeProvider>
            <DealsBoardContent />
          </GroupChipModeProvider>
        </ExpandModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
