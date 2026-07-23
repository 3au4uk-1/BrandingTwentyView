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

import { useShouldUseMobileLayout } from './hooks/useShouldUseMobileLayout';
import { useHostHeightLock } from './hooks/useHostHeightLock';
import { DESKTOP_BOARD_HEIGHT_CSS } from './utils/desktop-layout';
import { ColumnPicker } from './ColumnPicker';
import { MobileDealsBoard } from './mobile/MobileDealsBoard';
import { DealsTable } from './DealsTable/DealsTable';
import { ExpandModeToggle } from './ExpandModeToggle';
import { ExpandModeProvider } from './hooks/useExpandMode';
import { useDealBoardViews, useUpdateDealBoardView } from './hooks/useDealBoardViews';
import { useLineItems } from './hooks/useLineItems';
import { useOpportunities } from './hooks/useOpportunities';
import { useDealsBoardRealtimeSync } from './realtime/useDealsBoardRealtimeSync';
import { crmFieldNamesFromColumns, fieldTypesByNameFromDescriptors, needsCompanyRelation } from './metadata/crm-field-names';
import { mergeColumns } from './metadata/merge-columns';
import { useObjectFields } from './metadata/useObjectFields';
import { VIRTUAL_PARENT_FIELD_DESCRIPTORS } from './metadata/virtual-columns';
import { QuickFiltersBar, type QuickFiltersValue } from './QuickFiltersBar';
import type { DealBoardViewRecord, LineItemRow, OpportunityRow } from './types';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { Button } from './ui/Button';
import { CancelOtmenaProvider } from './ui/CancelOtmenaPopup';
import { PortalHostProvider } from './ui/PortalHostContext';
import { DEALS_BOARD_ROOT_ID } from './utils/dom';
import { mergeCompanyFilters, mergeStageFilters, mergeTypeFilters } from './utils/filters';
import { resolveActiveDealBoardView } from './utils/resolve-active-view';
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

const DEFAULT_QUICK_FILTERS: QuickFiltersValue = {
  datePreset: null,
  dateFrom: undefined,
  dateTo: undefined,
  stages: [],
  types: [],
  companyIds: [],
  oplata: 'all',
  search: '',
};

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
  const [quickFilters, setQuickFilters] = useState<QuickFiltersValue>(DEFAULT_QUICK_FILTERS);
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
  }, [
    activeView?.id,
    quickFilters.datePreset,
    quickFilters.dateFrom,
    quickFilters.dateTo,
    quickFilters.search,
    (quickFilters.stages ?? []).join(','),
    (quickFilters.types ?? []).join(','),
    (quickFilters.companyIds ?? []).join(','),
  ]);

  const mergedStages = useMemo(
    () => mergeStageFilters(activeView?.filters?.stages, quickFilters.stages),
    [activeView?.filters?.stages, quickFilters.stages],
  );

  const mergedTypes = useMemo(
    () => mergeTypeFilters(activeView?.filters?.types, quickFilters.types),
    [activeView?.filters?.types, quickFilters.types],
  );

  const mergedCompanyIds = useMemo(
    () => mergeCompanyFilters(activeView?.filters?.companyIds, quickFilters.companyIds),
    [activeView?.filters?.companyIds, quickFilters.companyIds],
  );

  const mergedFilters = useMemo(
    () => ({
      ...(activeView?.filters ?? {}),
      datePreset: quickFilters.datePreset ?? activeView?.filters?.datePreset,
      dateFrom: quickFilters.dateFrom ?? activeView?.filters?.dateFrom,
      dateTo: quickFilters.dateTo ?? activeView?.filters?.dateTo,
      search: quickFilters.search.trim() || activeView?.filters?.search,
      stages: mergedStages,
      types: mergedTypes,
      companyIds: mergedCompanyIds,
    }),
    [
      activeView?.filters,
      mergedCompanyIds,
      mergedStages,
      mergedTypes,
      quickFilters.dateFrom,
      quickFilters.datePreset,
      quickFilters.dateTo,
      quickFilters.search,
    ],
  );

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

  const opportunityRestFieldNames = useMemo(
    () => resolveOpportunityRestFieldNames(mergedParentColumns, parentFieldsQuery.data ?? []),
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

  const showAllDeals = activeView?.filters?.showAll ?? false;
  const effectiveShowAll = mobileLayoutActive ? false : showAllDeals;
  const pageSize = mobileLayoutActive ? MOBILE_PAGE_SIZE : DESKTOP_PAGE_SIZE;

  const opportunitiesQuery = useOpportunities({
    viewId: activeView?.id,
    filters: mergedFilters,
    sort: activeView?.sort ?? [],
    page: effectiveShowAll ? 0 : page,
    pageSize,
    showAll: effectiveShowAll,
    forcePaginated: mobileLayoutActive,
    visibleCrmFieldNames: visibleParentCrmFields,
    restFieldNames: opportunityRestFieldNames,
    includeCompanyRelation,
    fieldTypesByName: parentFieldTypesByName,
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
      mergedStages?.length || mergedTypes?.length
        ? { stages: mergedStages, types: mergedTypes }
        : undefined,
    [mergedStages, mergedTypes],
  );

  const lineItemsQuery = useLineItems(
    records.map((record) => record.id),
    lineItemQueryFilters,
    !opportunitiesQuery.isLoading,
  );
  const lineItems = asArray<LineItemRow>(lineItemsQuery.data);

  const recordsById = useMemo(
    () => new Map(records.map((record) => [record.id, record])),
    [records],
  );

  const visibleLineItems = useMemo(() => {
    const search = normalizeSearchTerm(mergedFilters.search);
    if (!search) return lineItems;
    return filterLineItemsForSearch(lineItems, search, recordsById);
  }, [lineItems, mergedFilters.search, recordsById]);

  const lineItemMatchedOpportunityIds = useMemo(() => {
    if (!mergedStages?.length && !mergedTypes?.length) {
      return undefined;
    }
    return new Set(lineItems.map((item) => item.opportunityId));
  }, [lineItems, mergedStages, mergedTypes]);

  const visibleRecords = useMemo(() => {
    if (!lineItemMatchedOpportunityIds) {
      return records;
    }

    return records.filter((record) => lineItemMatchedOpportunityIds.has(record.id));
  }, [records, lineItemMatchedOpportunityIds]);

  const visibleTotalCount = lineItemMatchedOpportunityIds ? visibleRecords.length : totalCount;

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
    const search = normalizeSearchTerm(mergedFilters.search);
    const scoped = mobileLineItems.length > 0 ? mobileLineItems : visibleLineItems;
    if (!search) return scoped;
    const recordsByMobileId = new Map(mobileRecords.map((record) => [record.id, record]));
    return filterLineItemsForSearch(scoped, search, recordsByMobileId);
  }, [
    mobileLayoutActive,
    mobileLineItems,
    mobileRecords,
    mergedFilters.search,
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

  const saveActiveViewColumns = async (target: 'parent' | 'child', columns: DealBoardViewRecord['parentColumns']) => {
    if (!activeView) return;

    try {
      await updateViewMutation.mutateAsync({
        id: activeView.id,
        data:
          target === 'parent'
            ? { parentColumns: columns }
            : { childColumns: columns, childGroups: activeView.childGroups },
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
          filters: {
            ...activeView.filters,
            showAll: nextShowAll,
          },
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
          quickFilters={quickFilters}
          onQuickFiltersChange={setQuickFilters}
          onQuickFiltersReset={() => setQuickFilters(DEFAULT_QUICK_FILTERS)}
          onPageChange={setPage}
          onSelectView={setActiveViewId}
          onCreateView={() => setIsCreateModalOpen(true)}
          onEditView={() => {
            if (activeView) setEditViewDraft(activeView);
          }}
          onParentColumnsSave={(columns) => saveActiveViewColumns('parent', columns)}
          onChildColumnsSave={(columns) => saveActiveViewColumns('child', columns)}
          onResetFilters={() => setQuickFilters(DEFAULT_QUICK_FILTERS)}
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
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: colors.bgSecondary,
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

                <QuickFiltersBar
                  value={quickFilters}
                  onChange={setQuickFilters}
                  onReset={() => setQuickFilters(DEFAULT_QUICK_FILTERS)}
                />

                <ExpandModeToggle />
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

                <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs, flexShrink: 0 }}>
                  <Button
                    theme={theme}
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (activeView) {
                        setEditViewDraft(activeView);
                      }
                    }}
                    disabled={!activeView}
                  >
                    Редактировать view
                  </Button>
                  <ColumnPicker
                    target="parent"
                    columns={mergedParentColumns}
                    onSave={(columns) => saveActiveViewColumns('parent', columns)}
                  />
                  <ColumnPicker
                    target="child"
                    columns={mergedChildColumns}
                    onSave={(columns) => saveActiveViewColumns('child', columns)}
                  />
                </div>
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
              parentDescriptorByField={parentDescriptorByField}
              childDescriptorByField={childDescriptorByField}
              opportunityLinkFields={opportunityLinkFields}
              records={visibleRecords}
              lineItems={visibleLineItems}
              lineItemFilters={lineItemQueryFilters}
              totalCount={visibleTotalCount}
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              onResetFilters={() => setQuickFilters(DEFAULT_QUICK_FILTERS)}
              onParentColumnsSave={(columns) => saveActiveViewColumns('parent', columns)}
              onChildColumnsSave={(columns) => saveActiveViewColumns('child', columns)}
              showAll={showAllDeals}
              onShowAllChange={(nextShowAll) => void handleShowAllChange(nextShowAll)}
              isLoading={opportunitiesQuery.isLoading}
              isViewLoading={viewsQuery.isLoading || viewsQuery.isSeedingDefault}
              errorMessage={
                loadError instanceof Error ? loadError.message : loadError ? String(loadError) : undefined
              }
            />
          </div>
        </>
      )}

      <ViewSettingsModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={(view) => setActiveViewId(view.id)}
      />

      <ViewSettingsModal
        isOpen={Boolean(editViewDraft)}
        initialView={editViewDraft}
        onClose={() => setEditViewDraft(undefined)}
        onSaved={(view) => setActiveViewId(view.id)}
      />
    </div>
      </CancelOtmenaProvider>
    </PortalHostProvider>
  );
};

export const DealsBoard = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ExpandModeProvider>
          <DealsBoardContent />
        </ExpandModeProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
