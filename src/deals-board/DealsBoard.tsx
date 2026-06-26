import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'twenty-sdk/front-component';

import { AppSettingsModal } from './AppSettingsModal';
import { ColumnPicker } from './ColumnPicker';
import { DealsTable } from './DealsTable/DealsTable';
import { ExpandModeProvider } from './hooks/useExpandMode';
import { useDealBoardViews, useUpdateDealBoardView } from './hooks/useDealBoardViews';
import { useLineItems } from './hooks/useLineItems';
import { useOpportunities } from './hooks/useOpportunities';
import { QuickFiltersBar, type QuickFiltersValue } from './QuickFiltersBar';
import type { DealBoardViewRecord, LineItemRow, OpportunityRow } from './types';
import { mergeStageFilters } from './utils/filters';
import { asArray } from './utils/parse-json-field';
import { ViewSettingsModal } from './ViewSettingsModal';
import { ViewSwitcher } from './ViewSwitcher';

const queryClient = new QueryClient();
const PAGE_SIZE = 50;

const DEFAULT_QUICK_FILTERS: QuickFiltersValue = {
  datePreset: null,
  dateFrom: undefined,
  dateTo: undefined,
  stages: [],
  oplata: 'all',
  search: '',
};

const DealsBoardContent = () => {
  const colorScheme = useColorScheme();
  const viewsQuery = useDealBoardViews();
  const updateViewMutation = useUpdateDealBoardView();
  const [activeViewId, setActiveViewId] = useState<string>();
  const [page, setPage] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [editViewDraft, setEditViewDraft] = useState<DealBoardViewRecord>();
  const [quickFilters, setQuickFilters] = useState<QuickFiltersValue>(DEFAULT_QUICK_FILTERS);
  const views = asArray<DealBoardViewRecord>(viewsQuery.data);

  const activeView = useMemo(() => {
    if (!views.length) return undefined;
    if (activeViewId) {
      const selected = views.find((view) => view.id === activeViewId);
      if (selected) return selected;
    }
    return views.find((view) => view.isDefault) ?? views[0];
  }, [activeViewId, views]);

  useEffect(() => {
    if (!activeViewId && activeView?.id) {
      setActiveViewId(activeView.id);
    }
  }, [activeView?.id, activeViewId]);

  useEffect(() => {
    setPage(0);
  }, [
    activeView?.id,
    quickFilters.dateFrom,
    quickFilters.dateTo,
    quickFilters.search,
    (quickFilters.stages ?? []).join(','),
  ]);

  const mergedStages = useMemo(
    () => mergeStageFilters(activeView?.filters?.stages, quickFilters.stages),
    [activeView?.filters?.stages, quickFilters.stages],
  );

  const mergedFilters = useMemo(
    () => ({
      ...(activeView?.filters ?? {}),
      dateFrom: quickFilters.dateFrom ?? activeView?.filters?.dateFrom,
      dateTo: quickFilters.dateTo ?? activeView?.filters?.dateTo,
      search: quickFilters.search.trim() || activeView?.filters?.search,
      stages: mergedStages,
    }),
    [activeView?.filters, mergedStages, quickFilters.dateFrom, quickFilters.dateTo, quickFilters.search],
  );

  const opportunitiesQuery = useOpportunities({
    viewId: activeView?.id,
    filters: mergedFilters,
    sort: activeView?.sort ?? [],
    page,
    pageSize: PAGE_SIZE,
    enabled: !viewsQuery.isLoading && !viewsQuery.isSeedingDefault && Boolean(activeView),
  });

  const records = asArray<OpportunityRow>(opportunitiesQuery.data?.records);
  const totalCount = opportunitiesQuery.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const visibleOpportunityIds = useMemo(() => records.map((record) => record.id), [records]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const lineItemsQuery = useLineItems(
    visibleOpportunityIds,
    mergedStages,
    !opportunitiesQuery.isLoading,
  );
  const lineItems = asArray<LineItemRow>(lineItemsQuery.data);

  const stageMatchedOpportunityIds = useMemo(() => {
    if (!mergedStages?.length) {
      return undefined;
    }
    return new Set(lineItems.map((item) => item.opportunityId));
  }, [lineItems, mergedStages]);

  const visibleRecords = useMemo(() => {
    if (!stageMatchedOpportunityIds) {
      return records;
    }

    return records.filter((record) => stageMatchedOpportunityIds.has(record.id));
  }, [records, stageMatchedOpportunityIds]);

  const visibleTotalCount = stageMatchedOpportunityIds
    ? visibleRecords.length
    : totalCount;

  const loadError = viewsQuery.error ?? opportunitiesQuery.error ?? null;
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
        data: target === 'parent' ? { parentColumns: columns } : { childColumns: columns },
      });
    } catch (error) {
      window.alert(
        `Не удалось обновить колонки view.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
      throw error;
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
        color: colorScheme === 'dark' ? '#eee' : '#333',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 10px',
          borderBottom: `1px solid ${colorScheme === 'dark' ? '#333' : '#eee'}`,
          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fafafa',
          flexWrap: 'nowrap',
        }}
      >
        <ViewSwitcher
          views={views}
          activeViewId={activeView?.id}
          colorScheme={colorScheme}
          onSelectView={setActiveViewId}
          onCreateView={() => setIsCreateModalOpen(true)}
        />

        <QuickFiltersBar
          colorScheme={colorScheme}
          value={quickFilters}
          onChange={setQuickFilters}
          onReset={() => setQuickFilters(DEFAULT_QUICK_FILTERS)}
        />

        <button
          type="button"
          onClick={() => setIsSettingsModalOpen(true)}
          style={{ fontSize: '12px', whiteSpace: 'nowrap' }}
        >
          ⚙ Настройки
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '8px',
          padding: '6px 10px',
          borderBottom: `1px solid ${colorScheme === 'dark' ? '#333' : '#eee'}`,
          backgroundColor: colorScheme === 'dark' ? '#191919' : '#fdfdfd',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              if (activeView) {
                setEditViewDraft(activeView);
              }
            }}
            disabled={!activeView}
            style={{ fontSize: '12px' }}
          >
            Редактировать view
          </button>
          <ColumnPicker
            target="parent"
            colorScheme={colorScheme}
            columns={activeView?.parentColumns ?? []}
            onSave={(columns) => saveActiveViewColumns('parent', columns)}
          />
          <ColumnPicker
            target="child"
            colorScheme={colorScheme}
            columns={activeView?.childColumns ?? []}
            onSave={(columns) => saveActiveViewColumns('child', columns)}
          />
        </div>
      </div>

      {lineItemsWarning ? (
        <div
          style={{
            padding: '6px 10px',
            fontSize: '12px',
            color: colorScheme === 'dark' ? '#f5c26b' : '#8a5a00',
            backgroundColor: colorScheme === 'dark' ? '#2a2418' : '#fff8e6',
            borderBottom: `1px solid ${colorScheme === 'dark' ? '#4a3b1f' : '#f0e2b6'}`,
            flexShrink: 0,
          }}
        >
          Позиции сделок не загрузились: {lineItemsWarning}
        </div>
      ) : null}

      <DealsTable
        colorScheme={colorScheme}
        activeView={activeView}
        records={visibleRecords}
        lineItems={lineItems}
        totalCount={visibleTotalCount}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onResetFilters={() => setQuickFilters(DEFAULT_QUICK_FILTERS)}
        isLoading={opportunitiesQuery.isLoading}
        isViewLoading={viewsQuery.isLoading || viewsQuery.isSeedingDefault}
        errorMessage={loadError instanceof Error ? loadError.message : loadError ? String(loadError) : undefined}
      />

      <ViewSettingsModal
        isOpen={isCreateModalOpen}
        colorScheme={colorScheme}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={(view) => setActiveViewId(view.id)}
      />

      <ViewSettingsModal
        isOpen={Boolean(editViewDraft)}
        initialView={editViewDraft}
        colorScheme={colorScheme}
        onClose={() => setEditViewDraft(undefined)}
        onSaved={(view) => setActiveViewId(view.id)}
      />

      <AppSettingsModal
        isOpen={isSettingsModalOpen}
        colorScheme={colorScheme}
        onClose={() => setIsSettingsModalOpen(false)}
      />
    </div>
  );
};

export const DealsBoard = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ExpandModeProvider>
        <DealsBoardContent />
      </ExpandModeProvider>
    </QueryClientProvider>
  );
};
