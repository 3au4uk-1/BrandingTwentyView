import {
  flexRender,
  functionalUpdate,
  getCoreRowModel,
  useReactTable,
  type Table,
} from '@tanstack/react-table';
import { Fragment, useMemo, type CSSProperties, type RefObject } from 'react';

import type { LineItemQueryFilters } from '../api/line-items';
import type { FieldDescriptor } from '../metadata/types';
import type { BoardStream } from 'src/constants/product-stream';
import { useTheme } from '../theme/ThemeContext';
import type {
  ColumnConfig,
  ColumnGroupConfig,
  DealBoardSort,
  LineItemRow,
  OpportunityRow,
} from '../types';
import {
  formatDaySeparatorLabel,
  getOpportunityDayKey,
  shouldInsertDaySeparatorBefore,
} from '../utils/day-separators';
import {
  buildParentColumnDefs,
  withParentExpandColumn,
  type ParentColumnMeta,
} from './build-parent-columns';
import { DealRow } from './DealRow';
import {
  dealBoardSortToSortingState,
  sortingStateToDealBoardSort,
} from './parent-table-sort';
import { lineItemDragSession } from './line-item-drag-session';
import { ResizableColumnHeader } from './ResizableColumnHeader';

export type DealsDataTableProps = {
  records: OpportunityRow[];
  layoutParentColumns: ColumnConfig[];
  parentTableStyle: CSSProperties;
  scrollRef: RefObject<HTMLDivElement | null>;
  isResizing: boolean;
  onPointerMove: (clientX: number) => void;
  onPointerEnd: () => void;
  beginParentResize: (
    event: MouseEvent | PointerEvent,
    field: string,
    startWidth: number,
    scaleSource?: HTMLElement | null,
    captureTarget?: HTMLElement | null,
  ) => void;
  beginChildResize: (
    event: MouseEvent | PointerEvent,
    field: string,
    startWidth: number,
    scaleSource?: HTMLElement | null,
    captureTarget?: HTMLElement | null,
  ) => void;
  childColumns: ColumnConfig[];
  childGroups: ColumnGroupConfig[];
  parentDescriptorByField: Map<string, FieldDescriptor>;
  childDescriptorByField: Map<string, FieldDescriptor>;
  opportunityLinkFields: FieldDescriptor[];
  lineItemsByOpportunity: Map<string, LineItemRow[]>;
  allDealLineItemsByOpportunity?: Map<string, LineItemRow[]>;
  companyNameMap: Map<string, string>;
  lineItemFilters?: LineItemQueryFilters;
  hasLineItemFilters?: boolean;
  showAllPositionOppIds?: Set<string>;
  onToggleShowAllPositions?: (opportunityId: string) => void;
  isExpanded: (id: string) => boolean;
  toggleExpand: (id: string) => void;
  showDaySeparators: boolean;
  sort: DealBoardSort[];
  onSortChange: (next: DealBoardSort[]) => void;
  attentionOpportunityIds?: Set<string> | null;
  boardStream?: BoardStream;
  onUnlinkSmeta?: (smetaId: string) => void;
};

const PINNED_LEFT_COLUMN_IDS = ['__expand', 'name'] as const;
const EMPTY_LINE_ITEMS: LineItemRow[] = [];

const getColumnFromHeader = (table: Table<OpportunityRow>, headerId: string): ColumnConfig => {
  const header = table.getFlatHeaders().find((item) => item.id === headerId);
  return (header?.column.columnDef.meta as ParentColumnMeta | undefined)?.column ?? {
    field: headerId,
    label: headerId,
    order: 0,
    visible: true,
  };
};

export const DealsDataTable = ({
  records,
  layoutParentColumns,
  parentTableStyle,
  scrollRef,
  isResizing,
  onPointerMove,
  onPointerEnd,
  beginParentResize,
  beginChildResize,
  childColumns,
  childGroups,
  parentDescriptorByField,
  childDescriptorByField,
  opportunityLinkFields,
  lineItemsByOpportunity,
  allDealLineItemsByOpportunity,
  companyNameMap,
  lineItemFilters,
  hasLineItemFilters = false,
  showAllPositionOppIds,
  onToggleShowAllPositions,
  isExpanded,
  toggleExpand,
  showDaySeparators,
  sort,
  onSortChange,
  attentionOpportunityIds = null,
  boardStream,
  onUnlinkSmeta,
}: DealsDataTableProps) => {
  const theme = useTheme();
  const { colors, font, spacing, zIndex } = theme;

  const tableColumns = useMemo(
    () => withParentExpandColumn(layoutParentColumns),
    [layoutParentColumns],
  );

  const columnDefs = useMemo(() => buildParentColumnDefs(tableColumns), [tableColumns]);

  const sortingState = useMemo(() => dealBoardSortToSortingState(sort), [sort]);

  const table = useReactTable({
    data: records,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    state: {
      sorting: sortingState,
      columnPinning: { left: [...PINNED_LEFT_COLUMN_IDS] },
    },
    onSortingChange: (updater) => {
      const next = functionalUpdate(updater, sortingState);
      onSortChange(sortingStateToDealBoardSort(next));
    },
  });

  const tableRows = table.getRowModel().rows;

  return (
    <div
      ref={scrollRef}
      onPointerMove={(event) => {
        if (isResizing) onPointerMove(event.clientX);
        if (lineItemDragSession.isActive()) lineItemDragSession.move(event.clientY);
      }}
      onPointerUp={() => {
        onPointerEnd();
        if (lineItemDragSession.isActive()) lineItemDragSession.end();
      }}
      onPointerCancel={() => {
        onPointerEnd();
        if (lineItemDragSession.isActive()) lineItemDragSession.cancel();
      }}
      onMouseMove={(event) => {
        if (isResizing) onPointerMove(event.clientX);
        if (lineItemDragSession.isActive()) lineItemDragSession.move(event.clientY);
      }}
      onMouseUp={() => {
        onPointerEnd();
        if (lineItemDragSession.isActive()) lineItemDragSession.end();
      }}
      onMouseLeave={() => {
        onPointerEnd();
        if (lineItemDragSession.isActive()) lineItemDragSession.end();
      }}
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
          borderCollapse: 'separate',
          borderSpacing: 0,
          tableLayout: 'fixed',
          backgroundColor: colors.bg,
        }}
      >
        <colgroup>
          {tableColumns.map((column) => (
            <col
              key={column.field}
              style={{
                width: `${column.width}px`,
              }}
            />
          ))}
        </colgroup>
        <thead>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr
              key={headerGroup.id}
              style={{
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: colors.bgSecondary,
                boxShadow: `0 1px 0 ${colors.borderSubtle}`,
              }}
            >
              {headerGroup.headers.map((header) => {
                const column = getColumnFromHeader(table, header.id);
                const isPinnedLeft = header.column.getIsPinned() === 'left';
                const sortEntry = sortingState.find((entry) => entry.id === header.id);
                const sortDirection = sortEntry
                  ? sortEntry.desc
                    ? 'desc'
                    : 'asc'
                  : false;

                return (
                  <ResizableColumnHeader
                    key={header.id}
                    column={column}
                    onResizeStart={beginParentResize}
                    disableResize={column.field === '__expand'}
                    compact={column.field === '__expand'}
                    onHeaderClick={
                      header.column.getCanSort()
                        ? header.column.getToggleSortingHandler()
                        : undefined
                    }
                    sortDirection={sortDirection}
                    stickyStyle={
                      isPinnedLeft
                        ? {
                            position: 'sticky',
                            left: header.column.getStart('left'),
                            zIndex: zIndex.sticky + 1,
                            backgroundColor: colors.bgSecondary,
                            boxShadow: colors.stickyShadow,
                          }
                        : undefined
                    }
                  >
                    {column.field === 'loadDate' ? (
                      <span
                        style={{
                          fontWeight: theme.font.weightBold,
                          color: colors.text,
                          fontSize: theme.font.sizeMd,
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </span>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </ResizableColumnHeader>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {tableRows.map((tableRow, index) => {
            const row = tableRow.original;
            const dayKey = getOpportunityDayKey(row);
            const previousDayKey =
              index > 0 ? getOpportunityDayKey(tableRows[index - 1]!.original) : null;
            const insertSeparator = shouldInsertDaySeparatorBefore(
              previousDayKey,
              dayKey,
              showDaySeparators,
            );

            return (
              <Fragment key={row.id}>
                {insertSeparator && dayKey ? (
                  <tr>
                    <td
                      colSpan={tableColumns.length}
                      style={{
                        padding: `${spacing.xs} ${spacing.md}`,
                        backgroundColor: colors.bgSecondary,
                        borderTop: `1px solid ${colors.border}`,
                        borderBottom: `1px solid ${colors.borderSubtle}`,
                        fontSize: font.sizeXs,
                        fontWeight: font.weightMedium,
                        color: colors.textMuted,
                        letterSpacing: '0.02em',
                      }}
                    >
                      {formatDaySeparatorLabel(dayKey)}
                    </td>
                  </tr>
                ) : null}
                <DealRow
                  row={row}
                  companyName={row.companyName ?? companyNameMap.get(row.companyId ?? '')}
                  columns={tableColumns}
                  childColumns={childColumns}
                  childGroups={childGroups}
                  parentDescriptorByField={parentDescriptorByField}
                  childDescriptorByField={childDescriptorByField}
                  onChildColumnResizeStart={beginChildResize}
                  lineItems={lineItemsByOpportunity.get(row.id) ?? EMPTY_LINE_ITEMS}
                  allDealLineItems={
                    allDealLineItemsByOpportunity?.get(row.id) ?? EMPTY_LINE_ITEMS
                  }
                  isExpanded={isExpanded(row.id)}
                  onToggleExpand={toggleExpand}
                  opportunityLinkFields={opportunityLinkFields}
                  filters={lineItemFilters}
                  hasLineItemFilters={hasLineItemFilters}
                  showAllPositions={showAllPositionOppIds?.has(row.id) ?? false}
                  onToggleShowAllPositions={onToggleShowAllPositions}
                  attentionHighlighted={attentionOpportunityIds?.has(row.id) ?? false}
                  boardStream={boardStream}
                  onUnlinkSmeta={onUnlinkSmeta}
                />
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
