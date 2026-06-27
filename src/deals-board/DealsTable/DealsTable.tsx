import { useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { fetchCompanyNames } from '../api/companies';
import type { FieldDescriptor } from '../metadata/types';
import { useColumnResize } from '../hooks/useColumnResize';
import { useContainerWidth } from '../hooks/useContainerWidth';
import { useDealExpandState } from '../hooks/useDealExpandState';
import { useExpandMode } from '../hooks/useExpandMode';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import type { ColumnConfig, DealBoardViewRecord, LineItemRow, OpportunityRow } from '../types';
import {
  readColumnUserSized,
  writeColumnUserSized,
  type ColumnResizeTarget,
} from '../utils/browser-storage';
import { getTableLayoutStyle, layoutColumnsForContainer, visibleColumns } from '../utils/columns';
import { DealRow } from './DealRow';
import { ResizableColumnHeader } from './ResizableColumnHeader';

type DealsTableProps = {
  activeView?: DealBoardViewRecord;
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  parentDescriptorByField: Map<string, FieldDescriptor>;
  childDescriptorByField: Map<string, FieldDescriptor>;
  opportunityLinkFields: FieldDescriptor[];
  records: OpportunityRow[];
  lineItems: LineItemRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  onResetFilters?: () => void;
  onParentColumnsSave?: (columns: ColumnConfig[]) => void;
  onChildColumnsSave?: (columns: ColumnConfig[]) => void;
  isLoading?: boolean;
  isViewLoading?: boolean;
  errorMessage?: string;
};

export const DealsTable = ({
  activeView,
  parentColumns: allParentColumns,
  childColumns: allChildColumns,
  parentDescriptorByField,
  childDescriptorByField,
  opportunityLinkFields,
  records,
  lineItems,
  totalCount,
  page,
  totalPages,
  onPageChange,
  onResetFilters,
  onParentColumnsSave,
  onChildColumnsSave,
  isLoading = false,
  isViewLoading = false,
  errorMessage,
}: DealsTableProps) => {  const theme = useTheme();
  const { colors, font, spacing, zIndex } = theme;
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const { mode } = useExpandMode();
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [parentUserSized, setParentUserSized] = useState(false);
  const containerWidth = useContainerWidth(scrollRef);

  const parentColumns = useMemo(() => visibleColumns(allParentColumns), [allParentColumns]);
  const childColumns = useMemo(() => visibleColumns(allChildColumns), [allChildColumns]);
  const parentStructureKey = useMemo(
    () => parentColumns.map((column) => `${column.field}:${column.visible}:${column.order}`).join('|'),
    [parentColumns],
  );

  useEffect(() => {
    if (!activeView?.id) {
      setParentUserSized(false);
      return;
    }
    setParentUserSized(readColumnUserSized(activeView.id, 'parent'));
  }, [activeView?.id, parentStructureKey]);

  const markColumnsUserSized = useCallback(
    (target: ColumnResizeTarget) => {
      if (!activeView?.id) return;
      writeColumnUserSized(activeView.id, target, true);
      if (target === 'parent') {
        setParentUserSized(true);
      }
    },
    [activeView?.id],
  );

  const mergeColumnWidths = useCallback(
    (allColumns: ColumnConfig[], resizedVisibleColumns: ColumnConfig[]) => {
      const widthByField = new Map(
        resizedVisibleColumns.map((column) => [column.field, column.width]),
      );

      return allColumns.map((column) =>
        widthByField.has(column.field) ? { ...column, width: widthByField.get(column.field) } : column,
      );
    },
    [],
  );

  const handleParentColumnsSave = useCallback(
    (resizedVisibleColumns: ColumnConfig[]) => {
      onParentColumnsSave?.(mergeColumnWidths(allParentColumns, resizedVisibleColumns));
    },
    [allParentColumns, mergeColumnWidths, onParentColumnsSave],
  );
  const handleChildColumnsSave = useCallback(
    (resizedVisibleColumns: ColumnConfig[]) => {
      onChildColumnsSave?.(mergeColumnWidths(allChildColumns, resizedVisibleColumns));
    },
    [allChildColumns, mergeColumnWidths, onChildColumnsSave],
  );

  const {
    displayColumns: displayParentColumns,
    beginResize: beginParentResize,
    handleResizeMove: handleParentResizeMove,
    finishResize: finishParentResize,
    isResizing: isParentResizing,
  } = useColumnResize(
    parentColumns,
    handleParentColumnsSave,
    () => {
      markColumnsUserSized('parent');
    },
  );
  const {
    displayColumns: displayChildColumns,
    beginResize: beginChildResize,
    handleResizeMove: handleChildResizeMove,
    finishResize: finishChildResize,
    isResizing: isChildResizing,
  } = useColumnResize(
    childColumns,
    handleChildColumnsSave,
    () => {
      markColumnsUserSized('child');
    },
  );

  const isResizing = isParentResizing || isChildResizing;

  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (isParentResizing) handleParentResizeMove(clientX);
      if (isChildResizing) handleChildResizeMove(clientX);
    },
    [handleChildResizeMove, handleParentResizeMove, isChildResizing, isParentResizing],
  );

  const handlePointerEnd = useCallback(() => {
    finishParentResize();
    finishChildResize();
  }, [finishChildResize, finishParentResize]);

  const layoutParentColumns = useMemo(() => {
    if (parentUserSized) return displayParentColumns;
    return layoutColumnsForContainer(displayParentColumns, containerWidth, 'name');
  }, [containerWidth, displayParentColumns, parentUserSized]);

  const parentTableStyle = getTableLayoutStyle(layoutParentColumns, containerWidth);

  const companyIds = useMemo(
    () =>
      [...new Set(records.map((record) => record.companyId).filter((id): id is string => Boolean(id)))].sort(),
    [records],
  );

  const companyNamesQuery = useQuery({
    queryKey: ['companyNames', companyIds],
    queryFn: () => fetchCompanyNames(companyIds),
    enabled: companyIds.length > 0,
    staleTime: 60_000,
  });

  const companyNameMap = companyNamesQuery.data ?? new Map<string, string>();

  const lineItemsByOpportunity = useMemo(() => {
    const grouped = new Map<string, typeof lineItems>();
    for (const item of lineItems) {
      const current = grouped.get(item.opportunityId) ?? [];
      grouped.set(item.opportunityId, [...current, item]);
    }
    return grouped;
  }, [lineItems]);

  const { isExpanded, toggleExpand } = useDealExpandState(
    activeView?.id,
    lineItemsByOpportunity,
    mode,
  );

  if (isViewLoading || isLoading) {
    return (
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner theme={theme} label="Загрузка сделок..." />
      </div>
    );
  }

  if (!activeView) {
    return (
      <EmptyState theme={theme} title="View не выбрана" description="Создайте или выберите представление в верхней панели." />
    );
  }

  if (errorMessage) {
    return (
      <EmptyState
        theme={theme}
        title="Не удалось загрузить данные"
        description={errorMessage}
      />
    );
  }

  if (!records.length) {
    return (
      <EmptyState
        theme={theme}
        title="Нет сделок по фильтрам"
        description="Попробуйте изменить фильтры или сбросить их."
        action={{ label: 'Сбросить фильтры', onClick: () => onResetFilters?.() }}
      />
    );
  }

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        ref={scrollRef}
        onPointerMove={(event) => {
          if (!isResizing) return;
          handlePointerMove(event.clientX);
        }}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        onMouseMove={(event) => {
          if (!isResizing) return;
          handlePointerMove(event.clientX);
        }}
        onMouseUp={handlePointerEnd}
        onMouseLeave={handlePointerEnd}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          userSelect: isResizing ? 'none' : undefined,
        }}
      >
        <table
          style={{
            ...parentTableStyle,
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            backgroundColor: colors.bg,
          }}
        >
          <colgroup>
            {layoutParentColumns.map((column) => (
              <col
                key={column.field}
                style={{
                  width: `${column.width}px`,
                }}
              />
            ))}
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: zIndex.sticky + 1 }}>
            <tr
              style={{
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: colors.bgSecondary,
                boxShadow: `0 1px 0 ${colors.borderSubtle}`,
              }}
            >
              {layoutParentColumns.map((column) => (
                <ResizableColumnHeader
                  key={column.field}
                  column={column}
                  onResizeStart={beginParentResize}
                  stickyStyle={
                    column.field === 'name'
                      ? {
                          position: 'sticky',
                          left: 0,
                          zIndex: zIndex.sticky + 2,
                          backgroundColor: colors.bgSecondary,
                          boxShadow: colors.stickyShadow,
                        }
                      : undefined
                  }
                >
                  {column.label}
                </ResizableColumnHeader>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((row) => (
              <DealRow
                key={row.id}
                row={{ ...row, companyName: row.companyName ?? companyNameMap.get(row.companyId ?? '') }}
                columns={layoutParentColumns}
                childColumns={displayChildColumns}
                parentDescriptorByField={parentDescriptorByField}
                childDescriptorByField={childDescriptorByField}
                onChildColumnResizeStart={beginChildResize}
                lineItems={lineItemsByOpportunity.get(row.id) ?? []}
                isExpanded={isExpanded(row.id)}
                isHovered={hoveredRowId === row.id}
                onHoverChange={(hovered) => setHoveredRowId(hovered ? row.id : null)}
                onToggleExpand={toggleExpand}
                opportunityLinkFields={opportunityLinkFields}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: `${spacing.sm} ${spacing.md}`,
          fontSize: font.sizeSm,
          color: colors.textMuted,
          backgroundColor: colors.bgSecondary,
          borderTop: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: theme.font.mono }}>
          Страница {page + 1} / {totalPages} · Всего {totalCount}
        </span>

        <div style={{ display: 'flex', gap: spacing.sm }}>
          <Button theme={theme} variant="secondary" size="sm" onClick={() => onPageChange(Math.max(0, page - 1))} disabled={!canPrev}>
            Назад
          </Button>
          <Button
            theme={theme}
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={!canNext}
          >
            Вперёд
          </Button>
        </div>
      </div>
    </div>
  );
};
