import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import type { ColumnConfig, LineItemRow, OpportunityRow } from '../types';
import { getColumnWidth } from '../utils/columns';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';
import { LineItemsTable } from './LineItemsTable';

type DealRowProps = {
  row: OpportunityRow;
  columns: ColumnConfig[];
  childColumns: ColumnConfig[];
  parentDescriptorByField: Map<string, FieldDescriptor>;
  childDescriptorByField: Map<string, FieldDescriptor>;
  lineItems: LineItemRow[];
  isExpanded: boolean;
  isHovered: boolean;
  onHoverChange: (hovered: boolean) => void;
  onToggleExpand: (id: string) => void;
  opportunityLinkFields: FieldDescriptor[];
  onChildColumnResizeStart: (
    event: MouseEvent | PointerEvent,
    field: string,
    startWidth: number,
    scaleSource?: HTMLElement | null,
    captureTarget?: HTMLElement | null,
  ) => void;
};

export const DealRow = ({
  row,
  columns,
  childColumns,
  parentDescriptorByField,
  childDescriptorByField,
  lineItems,
  isExpanded,
  isHovered,
  onHoverChange,
  onToggleExpand,
  opportunityLinkFields,
  onChildColumnResizeStart,
}: DealRowProps) => {
  const theme = useTheme();
  const { colors, font, zIndex, colorScheme } = theme;
  const canExpand = lineItems.length > 0;
  const stageValue = typeof row.stage === 'string' ? row.stage : null;
  const stageStyles = getStageRowStyles(stageValue, colorScheme, 'parent');
  const rowBg = stageStyles.backgroundColor;

  return (
    <>
      <tr
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        style={{
          borderBottom: `1px solid ${colors.borderSubtle}`,
          backgroundColor: rowBg,
          transition: 'background-color 0.12s ease',
          boxShadow: isExpanded
            ? `inset 4px 0 0 ${stageStyles.accentColor}`
            : stageStyles.boxShadow,
        }}
      >
        {columns.map((column) => (
          <td
            key={column.field}
            style={{
              width: `${getColumnWidth(column)}px`,
              maxWidth: `${getColumnWidth(column)}px`,
              minWidth: `${getColumnWidth(column)}px`,
              padding: '7px 12px',
              fontSize: font.sizeSm,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: colors.textSecondary,
              boxSizing: 'border-box',
              verticalAlign: 'middle',
              ...(column.field === 'name'
                ? {
                    position: 'sticky' as const,
                    left: 0,
                    zIndex: zIndex.sticky,
                    backgroundColor: rowBg,
                    boxShadow: colors.stickyShadow,
                  }
                : {}),
            }}
          >
            <DynamicFieldCell
              objectName="opportunity"
              recordId={row.id}
              field={column.field}
              descriptor={parentDescriptorByField.get(column.field)}
              value={resolveFieldValue(row, column.field)}
              variant="parent"
              lineItems={lineItems}
              isExpanded={isExpanded}
              companyName={row.companyName}
              row={row}
              opportunityLinkFields={opportunityLinkFields}
              onToggleExpand={onToggleExpand}
            />
          </td>
        ))}
      </tr>
      {canExpand && isExpanded ? (
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
              items={lineItems}
              columns={childColumns}
              descriptorByField={childDescriptorByField}
              onColumnResizeStart={onChildColumnResizeStart}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
};
