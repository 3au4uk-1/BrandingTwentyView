import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { getColumnWidth, getTableLayoutStyle, sumColumnWidths } from '../utils/columns';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';

import type { ColumnConfig, LineItemRow } from '../types';
import { ResizableColumnHeader } from './ResizableColumnHeader';

type LineItemsTableProps = {
  items: LineItemRow[];
  columns: ColumnConfig[];
  descriptorByField: Map<string, FieldDescriptor>;
  onColumnResizeStart: (
    event: MouseEvent | PointerEvent,
    field: string,
    startWidth: number,
    scaleSource?: HTMLElement | null,
    captureTarget?: HTMLElement | null,
  ) => void;
};

export const LineItemsTable = ({
  items,
  columns,
  descriptorByField,
  onColumnResizeStart,
}: LineItemsTableProps) => {
  const theme = useTheme();
  const { colorScheme, colors, font, spacing } = theme;
  const tableStyle = getTableLayoutStyle(columns, sumColumnWidths(columns));

  if (!items.length) {
    return (
      <div
        style={{
          padding: `${spacing.sm} ${spacing.md} ${spacing.sm} 40px`,
          fontSize: font.sizeSm,
          color: colors.textMuted,
        }}
      >
        Нет позиций
      </div>
    );
  }

  return (
    <div style={{ padding: `${spacing.xs} ${spacing.md} ${spacing.sm} 28px` }}>
      <div
        style={{
          borderLeft: `2px solid ${colors.borderStrong}`,
          paddingLeft: spacing.md,
        }}
      >
        <table
          style={{
            ...tableStyle,
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            backgroundColor: colors.bgElevated,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: theme.radius.md,
            overflow: 'hidden',
          }}
        >
          <colgroup>
            {columns.map((column) => (
              <col key={column.field} style={{ width: `${getColumnWidth(column)}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.bgTertiary }}>
              {columns.map((column) => (
                <ResizableColumnHeader
                  key={column.field}
                  column={column}
                  onResizeStart={onColumnResizeStart}
                  compact
                >
                  {column.label}
                </ResizableColumnHeader>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, rowIndex) => {
              const stageStyles = getStageRowStyles(item.stage, colorScheme);

              return (
                <tr
                  key={item.id}
                  style={{
                    borderBottom:
                      rowIndex < items.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                    backgroundColor: stageStyles.backgroundColor,
                    transition: 'background-color 0.12s ease',
                    boxShadow: stageStyles.boxShadow,
                  }}
                >
                  {columns.map((column) => {
                    const width = getColumnWidth(column);

                    return (
                      <td
                        key={column.field}
                        style={{
                          width: `${width}px`,
                          maxWidth: `${width}px`,
                          minWidth: `${width}px`,
                          padding: '6px 10px',
                          fontSize: font.sizeSm,
                          color: colors.textSecondary,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          verticalAlign: 'middle',
                          boxSizing: 'border-box',
                          position: 'relative',
                        }}
                      >
                        <DynamicFieldCell
                          objectName="dealLineItem"
                          recordId={item.id}
                          field={column.field}
                          descriptor={descriptorByField.get(column.field)}
                          value={resolveFieldValue(item, column.field)}
                          variant="child"
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
