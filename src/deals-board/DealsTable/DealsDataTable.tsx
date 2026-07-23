import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type Table,
} from '@tanstack/react-table';
import { Fragment, useMemo, type CSSProperties, type RefObject } from 'react';

import type { LineItemQueryFilters } from '../api/line-items';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import type {
  ColumnConfig,
  ColumnGroupConfig,
  LineItemRow,
  OpportunityRow,
} from '../types';
import {
  formatDaySeparatorLabel,
  getOpportunityDayKey,
  shouldInsertDaySeparatorBefore,
} from '../utils/day-separators';
import { buildParentColumnDefs, type ParentColumnMeta } from './build-parent-columns';
import { DealRow } from './DealRow';
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
  companyNameMap: Map<string, string>;
  lineItemFilters?: LineItemQueryFilters;
  hasLineItemFilters?: boolean;
  showAllPositionOppIds?: Set<string>;
  onToggleShowAllPositions?: (opportunityId: string) => void;
  isExpanded: (id: string) => boolean;
  toggleExpand: (id: string) => void;
  hoveredRowId: string | null;
  onHoverRowChange: (rowId: string | null) => void;
  showDaySeparators: boolean;
};

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
  companyNameMap,
  lineItemFilters,
  hasLineItemFilters = false,
  showAllPositionOppIds,
  onToggleShowAllPositions,
  isExpanded,
  toggleExpand,
  hoveredRowId,
  onHoverRowChange,
  showDaySeparators,
}: DealsDataTableProps) => {
  const theme = useTheme();
  const { colors, font, spacing, zIndex } = theme;

  const columnDefs = useMemo(
    () => buildParentColumnDefs(layoutParentColumns),
    [layoutParentColumns],
  );

  const table = useReactTable({
    data: records,
    columns: columnDefs,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const tableRows = table.getRowModel().rows;

  return (
    <div
      ref={scrollRef}
      onPointerMove={(event) => {
        if (!isResizing) return;
        onPointerMove(event.clientX);
      }}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      onMouseMove={(event) => {
        if (!isResizing) return;
        onPointerMove(event.clientX);
      }}
      onMouseUp={onPointerEnd}
      onMouseLeave={onPointerEnd}
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
          {layoutParentColumns.map((column) => (
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
                return (
                  <ResizableColumnHeader
                    key={header.id}
                    column={column}
                    onResizeStart={beginParentResize}
                    stickyStyle={
                      column.field === 'name'
                        ? {
                            position: 'sticky',
                            left: 0,
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
                      colSpan={layoutParentColumns.length}
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
                  row={{
                    ...row,
                    companyName: row.companyName ?? companyNameMap.get(row.companyId ?? ''),
                  }}
                  columns={layoutParentColumns}
                  childColumns={childColumns}
                  childGroups={childGroups}
                  parentDescriptorByField={parentDescriptorByField}
                  childDescriptorByField={childDescriptorByField}
                  onChildColumnResizeStart={beginChildResize}
                  lineItems={lineItemsByOpportunity.get(row.id) ?? []}
                  isExpanded={isExpanded(row.id)}
                  isHovered={hoveredRowId === row.id}
                  onHoverChange={(hovered) => onHoverRowChange(hovered ? row.id : null)}
                  onToggleExpand={toggleExpand}
                  opportunityLinkFields={opportunityLinkFields}
                  filters={lineItemFilters}
                  hasLineItemFilters={hasLineItemFilters}
                  showAllPositions={showAllPositionOppIds?.has(row.id) ?? false}
                  onToggleShowAllPositions={
                    onToggleShowAllPositions
                      ? () => onToggleShowAllPositions(row.id)
                      : undefined
                  }
                />
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
