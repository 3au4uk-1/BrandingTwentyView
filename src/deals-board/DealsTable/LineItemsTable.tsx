import { useRef, useState } from 'react';

import {
  isDefaultLineItemHiddenByFilters,
  type LineItemQueryFilters,
} from '../api/line-items';
import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import { useCreateLineItem } from '../hooks/useLineItems';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { getColumnWidth, getTableLayoutStyle, sumColumnWidths } from '../utils/columns';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';

import type { ColumnConfig, LineItemRow } from '../types';
import { ResizableColumnHeader } from './ResizableColumnHeader';

type LineItemsTableProps = {
  opportunityId: string;
  items: LineItemRow[];
  columns: ColumnConfig[];
  descriptorByField: Map<string, FieldDescriptor>;
  filters?: LineItemQueryFilters;
  onColumnResizeStart: (
    event: MouseEvent | PointerEvent,
    field: string,
    startWidth: number,
    scaleSource?: HTMLElement | null,
    captureTarget?: HTMLElement | null,
  ) => void;
};

export const LineItemsTable = ({
  opportunityId,
  items,
  columns,
  descriptorByField,
  filters,
  onColumnResizeStart,
}: LineItemsTableProps) => {
  const theme = useTheme();
  const { colorScheme, colors, font, spacing } = theme;
  const tableStyle = getTableLayoutStyle(columns, sumColumnWidths(columns));
  const createLineItem = useCreateLineItem();
  const isCreatingRef = useRef(false);
  const [statusMessage, setStatusMessage] = useState<{
    kind: 'warning' | 'error';
    text: string;
  } | null>(null);
  const isHiddenByFilters = isDefaultLineItemHiddenByFilters(filters);

  const handleCreate = async () => {
    if (isCreatingRef.current) return;
    isCreatingRef.current = true;
    setStatusMessage(null);

    try {
      await createLineItem.mutateAsync(opportunityId);
      if (isHiddenByFilters) {
        setStatusMessage({
          kind: 'warning',
          text: 'Создано, но скрыто текущим фильтром',
        });
      }
    } catch (error) {
      setStatusMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Не удалось создать позицию',
      });
    } finally {
      isCreatingRef.current = false;
    }
  };

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
          <tfoot>
            <tr style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
              <td
                colSpan={columns.length}
                style={{
                  height: '28px',
                  padding: '0 8px',
                  backgroundColor: colors.bgInset,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    minWidth: 0,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => void handleCreate()}
                    disabled={createLineItem.isPending}
                    aria-label="Добавить позицию"
                    style={{
                      height: '24px',
                      padding: '0 6px',
                      border: 'none',
                      borderRadius: theme.radius.sm,
                      backgroundColor: 'transparent',
                      color: createLineItem.isPending ? colors.textMuted : colors.accentText,
                      cursor: createLineItem.isPending ? 'default' : 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: spacing.xs,
                      fontFamily: 'inherit',
                      fontSize: font.sizeXs,
                      fontWeight: font.weightMedium,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span aria-hidden style={{ fontSize: '15px', lineHeight: 1 }}>
                      +
                    </span>
                    {createLineItem.isPending ? 'Создание…' : 'Добавить позицию'}
                  </button>
                  {statusMessage ? (
                    <span
                      title={statusMessage.text}
                      style={{
                        minWidth: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color:
                          statusMessage.kind === 'error' ? colors.danger : colors.warning,
                        fontSize: font.sizeXs,
                      }}
                    >
                      {statusMessage.text}
                    </span>
                  ) : null}
                </div>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
