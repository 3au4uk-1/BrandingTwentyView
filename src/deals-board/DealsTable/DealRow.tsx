import { memo } from 'react';

import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import type { LineItemQueryFilters } from '../api/line-items';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { ChevronRightIcon } from '../ui/Icons';
import type {
  ColumnConfig,
  ColumnGroupConfig,
  LineItemRow,
  OpportunityRow,
} from '../types';
import { getColumnWidth } from '../utils/columns';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';
import { PARENT_EXPAND_COLUMN } from './build-parent-columns';
import { PARENT_EXPAND_COLUMN_FIELD } from './parent-table-sort';
import { LineItemsTable } from './LineItemsTable';

type DealRowProps = {
  row: OpportunityRow;
  companyName?: string;
  columns: ColumnConfig[];
  childColumns: ColumnConfig[];
  childGroups: ColumnGroupConfig[];
  parentDescriptorByField: Map<string, FieldDescriptor>;
  childDescriptorByField: Map<string, FieldDescriptor>;
  lineItems: LineItemRow[];
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  opportunityLinkFields: FieldDescriptor[];
  filters?: LineItemQueryFilters;
  hasLineItemFilters?: boolean;
  showAllPositions?: boolean;
  onToggleShowAllPositions?: (opportunityId: string) => void;
  onChildColumnResizeStart: (
    event: MouseEvent | PointerEvent,
    field: string,
    startWidth: number,
    scaleSource?: HTMLElement | null,
    captureTarget?: HTMLElement | null,
  ) => void;
};

const ExpandToggleButton = ({
  recordId,
  isExpanded,
  onToggleExpand,
}: {
  recordId: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}) => {
  const theme = useTheme();
  const { colors } = theme;

  return (
    <button
      type="button"
      data-expand-btn
      onClick={() => onToggleExpand(recordId)}
      style={{
        border: 'none',
        background: 'transparent',
        padding: '2px',
        width: '22px',
        minWidth: '22px',
        height: '22px',
        minHeight: '22px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isExpanded ? colors.accentText : colors.textMuted,
        cursor: 'pointer',
        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s ease, color 0.12s ease, background-color 0.12s ease',
        flexShrink: 0,
      }}
      aria-label={isExpanded ? 'Свернуть позиции' : 'Развернуть позиции'}
    >
      <ChevronRightIcon size={14} color="currentColor" />
    </button>
  );
};

export const DealRow = memo(function DealRow({
  row,
  companyName,
  columns,
  childColumns,
  childGroups,
  parentDescriptorByField,
  childDescriptorByField,
  lineItems,
  isExpanded,
  onToggleExpand,
  opportunityLinkFields,
  filters,
  hasLineItemFilters = false,
  showAllPositions = false,
  onToggleShowAllPositions,
  onChildColumnResizeStart,
}: DealRowProps) {
  const theme = useTheme();
  const { colors, font, zIndex, colorScheme } = theme;
  const stageValue = typeof row.stage === 'string' ? row.stage : null;
  const stageStyles = getStageRowStyles(stageValue, colorScheme, 'parent');
  const rowBg = colors.bg;
  const rowAccentShadow = isExpanded
    ? `inset 3px 0 0 ${stageStyles.accentColor}`
    : stageStyles.boxShadow;
  const expandColumnWidth = getColumnWidth(PARENT_EXPAND_COLUMN);
  const hasExpandColumn = columns.some((column) => column.field === PARENT_EXPAND_COLUMN_FIELD);

  const getPinnedCellStyle = (column: ColumnConfig) => {
    if (column.field === PARENT_EXPAND_COLUMN_FIELD) {
      return {
        position: 'sticky' as const,
        left: 0,
        zIndex: zIndex.sticky,
        backgroundColor: rowBg,
        boxShadow: rowAccentShadow,
      };
    }

    if (column.field === 'name') {
      return {
        position: 'sticky' as const,
        left: hasExpandColumn ? expandColumnWidth : 0,
        zIndex: zIndex.sticky,
        backgroundColor: rowBg,
        boxShadow: `${colors.stickyShadow}, ${rowAccentShadow}`,
      };
    }

    return {};
  };

  return (
    <>
      <tr
        data-deal-row=""
        style={{
          borderBottom: `1px solid ${colors.borderSubtle}`,
          backgroundColor: rowBg,
          transition: 'background-color 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
          boxShadow: rowAccentShadow,
        }}
      >
        {columns.map((column) => (
          <td
            key={column.field}
            style={{
              width: `${getColumnWidth(column)}px`,
              maxWidth: `${getColumnWidth(column)}px`,
              minWidth: `${getColumnWidth(column)}px`,
              padding: column.field === PARENT_EXPAND_COLUMN_FIELD ? '7px 4px' : '7px 12px',
              fontSize: font.sizeSm,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: colors.textSecondary,
              boxSizing: 'border-box',
              verticalAlign: 'middle',
              ...getPinnedCellStyle(column),
            }}
          >
            {column.field === PARENT_EXPAND_COLUMN_FIELD ? (
              <ExpandToggleButton
                recordId={row.id}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
              />
            ) : (
              <DynamicFieldCell
                objectName="opportunity"
                recordId={row.id}
                field={column.field}
                descriptor={parentDescriptorByField.get(column.field)}
                value={resolveFieldValue(row, column.field)}
                variant="parent"
                lineItems={lineItems}
                isExpanded={isExpanded}
                companyName={companyName}
                row={row}
                opportunityLinkFields={opportunityLinkFields}
                onToggleExpand={onToggleExpand}
                hideExpandButton={hasExpandColumn}
              />
            )}
          </td>
        ))}
      </tr>
      {isExpanded ? (
        <tr>
          <td
            colSpan={columns.length}
            style={{
              padding: 0,
              backgroundColor: colors.bgNested,
              borderBottom: `1px solid ${colors.border}`,
              boxShadow: `inset 4px 0 0 ${stageStyles.accentColor}`,
            }}
          >
            <LineItemsTable
              opportunityId={row.id}
              items={lineItems}
              columns={childColumns}
              groups={childGroups}
              descriptorByField={childDescriptorByField}
              filters={filters}
              hasLineItemFilters={hasLineItemFilters}
              showAllPositions={showAllPositions}
              onToggleShowAllPositions={
                onToggleShowAllPositions
                  ? () => onToggleShowAllPositions(row.id)
                  : undefined
              }
              onColumnResizeStart={onChildColumnResizeStart}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
});
