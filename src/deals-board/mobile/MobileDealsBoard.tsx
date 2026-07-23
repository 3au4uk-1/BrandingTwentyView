import { useMemo, useState } from 'react';

import { countActiveQuickFilters } from '../utils/count-active-quick-filters';
import { useDealExpandState } from '../hooks/useDealExpandState';
import { useExpandMode } from '../hooks/useExpandMode';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { MobileDealCard } from './MobileDealCard';
import { MobileFiltersSheet } from './MobileFiltersSheet';
import { MobileSettingsSheet } from './MobileSettingsSheet';
import { MobileToolbar } from './MobileToolbar';
import { MobileViewSwitcherSheet } from './MobileViewSwitcherSheet';
import type { MobileDealsBoardProps } from './types';

export const MobileDealsBoard = (props: MobileDealsBoardProps) => {
  const {
    activeView,
    views,
    parentColumns,
    childColumns,
    parentDescriptorByField,
    childDescriptorByField,
    opportunityLinkFields,
    records,
    lineItems,
    lineItemFilters,
    totalCount,
    page,
    totalPages,
    showAll,
    maxRecordsReached = false,
    quickFilters,
    onQuickFiltersChange,
    onQuickFiltersReset,
    onPageChange,
    onSelectView,
    onCreateView,
    onEditView,
    onParentColumnsSave,
    onChildColumnsSave,
    onResetFilters,
    isLoading,
    isViewLoading,
    errorMessage,
  } = props;

  const theme = useTheme();
  const { spacing } = theme;
  const { mode } = useExpandMode();

  const lineItemsByOpportunity = useMemo(() => {
    const grouped = new Map<string, typeof lineItems>();
    for (const item of lineItems) {
      const current = grouped.get(item.opportunityId) ?? [];
      grouped.set(item.opportunityId, [...current, item]);
    }
    return grouped;
  }, [lineItems]);

  const opportunityStageById = useMemo(
    () =>
      new Map(
        records.map((record) => [
          record.id,
          typeof record.stage === 'string' ? record.stage : null,
        ]),
      ),
    [records],
  );

  const { isExpanded, toggleExpand } = useDealExpandState(
    activeView?.id,
    lineItemsByOpportunity,
    mode,
    opportunityStageById,
  );

  const [viewSheetOpen, setViewSheetOpen] = useState(false);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);
  const [filtersSheetOpen, setFiltersSheetOpen] = useState(false);

  const openViewSheet = () => {
    setSettingsSheetOpen(false);
    setFiltersSheetOpen(false);
    setViewSheetOpen(true);
  };

  const openSettingsSheet = () => {
    setViewSheetOpen(false);
    setFiltersSheetOpen(false);
    setSettingsSheetOpen(true);
  };

  const openFiltersSheet = () => {
    setViewSheetOpen(false);
    setSettingsSheetOpen(false);
    setFiltersSheetOpen(true);
  };

  const activeFilterCount = countActiveQuickFilters(quickFilters);
  const hasMore = !showAll && !maxRecordsReached && page < totalPages - 1;

  return (
    <div
      data-mobile-deals-board
      data-layout="mobile"
      style={{ backgroundColor: theme.colors.bg, position: 'relative' }}
    >
      <MobileToolbar
        activeView={activeView}
        totalCount={totalCount}
        search={quickFilters.search}
        onSearchChange={(search) => onQuickFiltersChange({ ...quickFilters, search })}
        onOpenViewSheet={openViewSheet}
        onOpenSettingsSheet={openSettingsSheet}
        onOpenFiltersSheet={openFiltersSheet}
        activeFilterCount={activeFilterCount}
      />

      {errorMessage ? (
        <div role="alert" style={{ padding: spacing.md, color: theme.colors.danger }}>
          {errorMessage}
        </div>
      ) : null}

      {isLoading || isViewLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: spacing.xl }}>
          <Spinner theme={theme} label="Загрузка сделок..." />
        </div>
      ) : records.length === 0 ? (
        <EmptyState
          theme={theme}
          title="Нет сделок"
          action={
            onResetFilters ? { label: 'Сбросить фильтры', onClick: onResetFilters } : undefined
          }
        />
      ) : (
        <div style={{ padding: `${spacing.sm} ${spacing.md} ${spacing.lg}` }}>
          {records.map((row) => (
            <MobileDealCard
              key={row.id}
              row={row}
              lineItems={lineItems}
              parentColumns={parentColumns}
              childColumns={childColumns}
              parentDescriptorByField={parentDescriptorByField}
              childDescriptorByField={childDescriptorByField}
              opportunityLinkFields={opportunityLinkFields}
              isExpanded={isExpanded(row.id)}
              onToggleExpand={toggleExpand}
              lineItemFilters={lineItemFilters}
            />
          ))}
          {hasMore ? (
            <Button
              theme={theme}
              variant="secondary"
              size="md"
              onClick={() => onPageChange(page + 1)}
              style={{ width: '100%', minHeight: 44, marginTop: spacing.sm }}
            >
              Показать ещё
            </Button>
          ) : null}
          {maxRecordsReached && totalCount > records.length ? (
            <p
              style={{
                margin: `${spacing.sm} 0 0`,
                fontSize: theme.font.sizeXs,
                color: theme.colors.textMuted,
                textAlign: 'center',
              }}
            >
              Показаны первые {records.length} из {totalCount}. Уточните фильтры, чтобы сузить список.
            </p>
          ) : null}
        </div>
      )}

      <MobileViewSwitcherSheet
        isOpen={viewSheetOpen}
        onClose={() => setViewSheetOpen(false)}
        views={views}
        activeViewId={activeView?.id}
        onSelectView={onSelectView}
        onCreateView={onCreateView}
      />

      <MobileFiltersSheet
        isOpen={filtersSheetOpen}
        onClose={() => setFiltersSheetOpen(false)}
        value={quickFilters}
        onChange={onQuickFiltersChange}
        onReset={onQuickFiltersReset}
      />

      <MobileSettingsSheet
        isOpen={settingsSheetOpen}
        onClose={() => setSettingsSheetOpen(false)}
        activeView={activeView}
        parentColumns={parentColumns}
        childColumns={childColumns}
        onEditView={onEditView}
        onParentColumnsSave={onParentColumnsSave ?? (async () => undefined)}
        onChildColumnsSave={onChildColumnsSave ?? (async () => undefined)}
      />
    </div>
  );
};
