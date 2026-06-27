import { useQuery } from '@tanstack/react-query';
import { useCallback, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_CHILD_COLUMNS,
  DEFAULT_PARENT_COLUMNS,
} from 'src/constants/column-definitions';

import { fetchCompanyNames } from '../api/companies';
import { useDealExpandState } from '../hooks/useDealExpandState';
import { useExpandMode } from '../hooks/useExpandMode';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import type { ColumnConfig, DealBoardViewRecord, LineItemRow, OpportunityRow } from '../types';
import { visibleColumns, sumColumnWidths } from '../utils/columns';
import { useColumnResize } from '../hooks/useColumnResize';
import { DealRow } from './DealRow';
import { ResizableColumnHeader } from './ResizableColumnHeader';

type DealsTableProps = {
  activeView?: DealBoardViewRecord;
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
}: DealsTableProps) => {
  const theme = useTheme();
  const { colors, font, spacing, zIndex } = theme;
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const { mode } = useExpandMode();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const allParentColumns = useMemo(
    () => activeView?.parentColumns ?? DEFAULT_PARENT_COLUMNS,
    [activeView?.parentColumns],
  );
  const allChildColumns = useMemo(
    () => activeView?.childColumns ?? DEFAULT_CHILD_COLUMNS,
    [activeView?.childColumns],
  );
  const parentColumns = useMemo(() => visibleColumns(allParentColumns), [allParentColumns]);
  const childColumns = useMemo(() => visibleColumns(allChildColumns), [allChildColumns]);

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

  const { displayColumns: displayParentColumns, handleResizePointerDown: handleParentResizePointerDown } =
    useColumnResize(parentColumns, handleParentColumnsSave);
  const { displayColumns: displayChildColumns, handleResizePointerDown: handleChildResizePointerDown } =
    useColumnResize(childColumns, handleChildColumnsSave);

  const parentTableWidth = sumColumnWidths(displayParentColumns);

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
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
        }}
      >
        <table
          style={{
            width: `${parentTableWidth}px`,
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            backgroundColor: colors.bg,
          }}
        >
          <colgroup>
            {displayParentColumns.map((column) => (
              <col
                key={column.field}
                style={{
                  width: column.width ? `${column.width}px` : 'auto',
                }}
              />
            ))}
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: zIndex.sticky + 1 }}>
            <tr
              style={{
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: colors.bgSecondary,
              }}
            >
              {displayParentColumns.map((column) => (
                <ResizableColumnHeader
                  key={column.field}
                  column={column}
                  onResizePointerDown={handleParentResizePointerDown}
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
                columns={displayParentColumns}
                childColumns={displayChildColumns}
                onChildColumnResizePointerDown={handleChildResizePointerDown}
                lineItems={lineItemsByOpportunity.get(row.id) ?? []}
                isExpanded={isExpanded(row.id)}
                isHovered={hoveredRowId === row.id}
                onHoverChange={(hovered) => setHoveredRowId(hovered ? row.id : null)}
                onToggleExpand={toggleExpand}
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
          color: colors.textSecondary,
          backgroundColor: colors.bgSecondary,
          borderTop: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        <span>
          Страница {page + 1} из {totalPages} · Всего: {totalCount}
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
