import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_CHILD_COLUMNS,
  DEFAULT_PARENT_COLUMNS,
} from 'src/constants/column-definitions';
import { APP_DISPLAY_NAME } from 'src/constants/universal-identifiers';

import {
  resolveOpportunityLinkFieldDescriptors,
  resolveOpportunityLinkFieldNames,
} from 'src/constants/opportunity-links';

import { ColumnPicker } from './ColumnPicker';
import { DealsTable } from './DealsTable/DealsTable';
import { ExpandModeToggle } from './ExpandModeToggle';
import { ExpandModeProvider } from './hooks/useExpandMode';
import { useDealBoardViews, useUpdateDealBoardView } from './hooks/useDealBoardViews';
import { useLineItems } from './hooks/useLineItems';
import { useOpportunities } from './hooks/useOpportunities';
import { crmFieldNamesFromColumns, needsCompanyRelation } from './metadata/crm-field-names';
import { mergeColumns } from './metadata/merge-columns';
import { useObjectFields } from './metadata/useObjectFields';
import { VIRTUAL_PARENT_FIELD_DESCRIPTORS } from './metadata/virtual-columns';
import { QuickFiltersBar, type QuickFiltersValue } from './QuickFiltersBar';
import type { DealBoardViewRecord, LineItemRow, OpportunityRow } from './types';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { Button } from './ui/Button';
import { PortalHostProvider } from './ui/PortalHostContext';
import { DEALS_BOARD_ROOT_ID } from './utils/dom';
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
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const rootRef = useRef<HTMLDivElement | null>(null);
  const viewsQuery = useDealBoardViews();
  const updateViewMutation = useUpdateDealBoardView();
  const [activeViewId, setActiveViewId] = useState<string>();
  const [page, setPage] = useState(0);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
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
    quickFilters.datePreset,
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
      datePreset: quickFilters.datePreset ?? activeView?.filters?.datePreset,
      dateFrom: quickFilters.dateFrom ?? activeView?.filters?.dateFrom,
      dateTo: quickFilters.dateTo ?? activeView?.filters?.dateTo,
      search: quickFilters.search.trim() || activeView?.filters?.search,
      stages: mergedStages,
    }),
    [
      activeView?.filters,
      mergedStages,
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

  const opportunitiesQuery = useOpportunities({
    viewId: activeView?.id,
    filters: mergedFilters,
    sort: activeView?.sort ?? [],
    page,
    pageSize: PAGE_SIZE,
    visibleCrmFieldNames: visibleParentCrmFields,
    linkFieldNames: opportunityLinkFieldNames,
    includeCompanyRelation,
    enabled:
      !viewsQuery.isLoading &&
      !viewsQuery.isSeedingDefault &&
      Boolean(activeView) &&
      !parentFieldsQuery.isLoading,
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

  const visibleTotalCount = stageMatchedOpportunityIds ? visibleRecords.length : totalCount;

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
    <PortalHostProvider hostRef={rootRef}>
      <div
        ref={rootRef}
        id={DEALS_BOARD_ROOT_ID}
        style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: colors.bg,
        color: colors.text,
        fontFamily: font.family,
        fontSize: font.sizeSm,
      }}
    >
      <header
        style={{
          flexShrink: 0,
          borderBottom: `1px solid ${colors.border}`,
          backgroundColor: colors.bgSecondary,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            padding: `${spacing.sm} ${spacing.md}`,
            borderBottom: `1px solid ${colors.borderSubtle}`,
          }}
        >
          <ViewSwitcher
            views={views}
            activeViewId={activeView?.id}
            onSelectView={setActiveViewId}
            onCreateView={() => setIsCreateModalOpen(true)}
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
            padding: `${spacing.xs} ${spacing.md}`,
            minHeight: '36px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.sm, minWidth: 0 }}>
            <span style={{ fontSize: font.sizeMd, fontWeight: font.weightSemibold, color: colors.text }}>
              {APP_DISPLAY_NAME}
            </span>
            {activeView ? (
              <span style={{ fontSize: font.sizeSm, color: colors.textMuted, whiteSpace: 'nowrap' }}>
                {activeView.name}
                {!opportunitiesQuery.isLoading ? ` · ${visibleTotalCount} сделок` : ''}
              </span>
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

      <DealsTable
        activeView={activeView}
        parentColumns={mergedParentColumns}
        childColumns={mergedChildColumns}
        parentDescriptorByField={parentDescriptorByField}
        childDescriptorByField={childDescriptorByField}
        opportunityLinkFields={opportunityLinkFields}
        records={visibleRecords}
        lineItems={lineItems}
        totalCount={visibleTotalCount}
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
        onResetFilters={() => setQuickFilters(DEFAULT_QUICK_FILTERS)}
        onParentColumnsSave={(columns) => saveActiveViewColumns('parent', columns)}
        onChildColumnsSave={(columns) => saveActiveViewColumns('child', columns)}
        isLoading={opportunitiesQuery.isLoading}
        isViewLoading={viewsQuery.isLoading || viewsQuery.isSeedingDefault}
        errorMessage={loadError instanceof Error ? loadError.message : loadError ? String(loadError) : undefined}
      />

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
