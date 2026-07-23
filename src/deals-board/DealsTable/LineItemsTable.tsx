import { useRef, useState } from 'react';

import {
  isDefaultLineItemHiddenByFilters,
  type LineItemQueryFilters,
} from '../api/line-items';
import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import { GroupColumnCell } from '../cells/GroupColumnCell';
import { useCreateLineItem } from '../hooks/useLineItems';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { getColumnWidth, getTableLayoutStyle, sumColumnWidths } from '../utils/columns';
import { buildChildLayoutColumns } from '../utils/column-groups';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';

import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';
import { ResizableColumnHeader } from './ResizableColumnHeader';

const GROUP_COLUMN_WIDTH = 160;

type LineItemsTableProps = {
  opportunityId: string;
  items: LineItemRow[];
  columns: ColumnConfig[];
  groups: ColumnGroupConfig[];
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
  groups,
  descriptorByField,
  filters,
  onColumnResizeStart,
}: LineItemsTableProps) => {
  const theme = useTheme();
  const { colorScheme, colors, font, spacing } = theme;
  const layout = buildChildLayoutColumns(columns, groups);
  const layoutColumns = layout.map((entry) =>
    'type' in entry
      ? {
          field: `group:${entry.group.id}`,
          label: entry.group.name,
          order: entry.group.order,
          visible: true,
          width: GROUP_COLUMN_WIDTH,
        }
      : entry,
  );
  const tableStyle = getTableLayoutStyle(layoutColumns, sumColumnWidths(layoutColumns));
  const visibleFields = columns.map(({ field }) => field);
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
            {layoutColumns.map((column) => (
              <col key={column.field} style={{ width: `${getColumnWidth(column)}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.bgTertiary }}>
              {layout.map((entry) =>
                'type' in entry ? (
                  <th
                    key={entry.group.id}
                    scope="col"
                    style={{
                      width: `${GROUP_COLUMN_WIDTH}px`,
                      padding: '6px 10px',
                      color: colors.textSecondary,
                      fontSize: font.sizeXs,
                      fontWeight: font.weightMedium,
                      textAlign: 'left',
                    }}
                  >
                    {entry.group.name}
                  </th>
                ) : (
                  <ResizableColumnHeader
                    key={entry.field}
                    column={entry}
                    onResizeStart={onColumnResizeStart}
                    compact
                  >
                    {entry.label}
                  </ResizableColumnHeader>
                ),
              )}
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
                  {layout.map((entry) => {
                    const isGroup = 'type' in entry;
                    const width = isGroup ? GROUP_COLUMN_WIDTH : getColumnWidth(entry);

                    return (
                      <td
                        key={isGroup ? entry.group.id : entry.field}
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
                        {isGroup ? (
                          <GroupColumnCell
                            group={entry.group}
                            members={entry.members}
                            item={item}
                            descriptorByField={descriptorByField}
                            visibleFields={visibleFields}
                          />
                        ) : (
                          <DynamicFieldCell
                            objectName="dealLineItem"
                            recordId={item.id}
                            field={entry.field}
                            descriptor={descriptorByField.get(entry.field)}
                            value={resolveFieldValue(item, entry.field)}
                            variant="child"
                            row={item}
                            visibleFields={visibleFields}
                          />
                        )}
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
                colSpan={layout.length}
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
