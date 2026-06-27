import { useMemo, useRef } from 'react';

import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import { useContainerWidth } from '../hooks/useContainerWidth';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { getColumnWidth, getTableLayoutStyle, layoutColumnsForContainer } from '../utils/columns';
import { resolveFieldValue } from '../utils/resolve-field-value';

import type { ColumnConfig, LineItemRow } from '../types';
import { ResizableColumnHeader } from './ResizableColumnHeader';

type LineItemsTableProps = {
  items: LineItemRow[];
  columns: ColumnConfig[];
  descriptorByField: Map<string, FieldDescriptor>;
  onColumnResizeStart: (event: MouseEvent, field: string, startWidth: number) => void;
  userSized?: boolean;
};

export const LineItemsTable = ({
  items,
  columns,
  descriptorByField,
  onColumnResizeStart,
  userSized = false,
}: LineItemsTableProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerWidth = useContainerWidth(containerRef);

  const layoutColumns = useMemo(() => {
    if (userSized) return columns;
    return layoutColumnsForContainer(columns, containerWidth, 'name');
  }, [columns, containerWidth, userSized]);

  const tableStyle = getTableLayoutStyle(layoutColumns, containerWidth);

  if (!items.length) {
    return (
      <div
        style={{
          padding: `${spacing.sm} ${spacing.md}`,
          fontSize: font.sizeSm,
          color: colors.textMuted,
        }}
      >
        Нет позиций
      </div>
    );
  }

  return (
    <div style={{ padding: `${spacing.xs} ${spacing.md} ${spacing.sm} 36px` }}>
      <div ref={containerRef}>
        <table
          style={{
            ...tableStyle,
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            backgroundColor: colors.bgElevated,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: theme.radius.md,
          }}
        >
          <colgroup>
            {layoutColumns.map((column) => (
              <col key={column.field} style={{ width: `${getColumnWidth(column)}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
              {layoutColumns.map((column) => (
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
            {items.map((item, rowIndex) => (
              <tr
                key={item.id}
                style={{
                  borderBottom:
                    rowIndex < items.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                  backgroundColor: colors.bgElevated,
                }}
              >
                {layoutColumns.map((column) => {
                  const width = getColumnWidth(column);

                  return (
                    <td
                      key={column.field}
                      style={{
                        width: `${width}px`,
                        maxWidth: `${width}px`,
                        minWidth: `${width}px`,
                        padding: '8px 10px',
                        fontSize: font.sizeSm,
                        color: colors.textSecondary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        verticalAlign: 'middle',
                        boxSizing: 'border-box',
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
