import { useRef, useState } from 'react';

import {
  isDefaultLineItemHiddenByFilters,
  type LineItemQueryFilters,
} from '../api/line-items';
import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import { GroupChipsCell } from '../cells/GroupChipsCell';
import { GroupFieldStrip } from '../cells/GroupFieldStrip';
import { useCreateLineItem } from '../hooks/useLineItems';
import { useLineItemGroupExpand } from '../hooks/useLineItemGroupExpand';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { getColumnWidth, getTableLayoutStyle, sumColumnWidths } from '../utils/columns';
import {
  buildChildLayoutColumns,
  getVisibleFieldsForChildLayoutEntry,
  partitionUngroupedAndGroups,
} from '../utils/column-groups';
import { findActiveGroupMembers } from '../utils/active-group';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';

import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';
import { ResizableColumnHeader } from './ResizableColumnHeader';

const GROUP_ZONE_MIN_WIDTH = 280;

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
  const { ungrouped, groupEntries } = partitionUngroupedAndGroups(layout);
  const tableStyle = getTableLayoutStyle(
    ungrouped,
    sumColumnWidths(ungrouped) + GROUP_ZONE_MIN_WIDTH,
  );
  const createLineItem = useCreateLineItem();
  const { isExpanded, toggle } = useLineItemGroupExpand();
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
            {ungrouped.map((column) => (
              <col key={column.field} style={{ width: `${getColumnWidth(column)}px` }} />
            ))}
            <col style={{ width: '50%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.bgTertiary }}>
              {ungrouped.map((entry) => (
                <ResizableColumnHeader
                  key={entry.field}
                  column={entry}
                  onResizeStart={onColumnResizeStart}
                  compact
                >
                  {entry.label}
                </ResizableColumnHeader>
              ))}
              <th
                scope="col"
                style={{
                  minWidth: `${GROUP_ZONE_MIN_WIDTH}px`,
                  maxWidth: '50%',
                  padding: '6px 10px',
                  color: colors.textSecondary,
                  fontSize: font.sizeXs,
                  fontWeight: font.weightMedium,
                  textAlign: 'left',
                }}
              >
                Группы
              </th>
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
                  {ungrouped.map((entry) => {
                    const width = getColumnWidth(entry);

                    return (
                      <td
                        key={entry.field}
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
                          field={entry.field}
                          descriptor={descriptorByField.get(entry.field)}
                          value={resolveFieldValue(item, entry.field)}
                          variant="child"
                          row={item}
                          visibleFields={getVisibleFieldsForChildLayoutEntry(layout, entry)}
                        />
                      </td>
                    );
                  })}
                  <td
                    style={{
                      minWidth: `${GROUP_ZONE_MIN_WIDTH}px`,
                      maxWidth: '50%',
                      padding: '6px 10px',
                      fontSize: font.sizeSm,
                      color: colors.textSecondary,
                      verticalAlign: 'middle',
                      boxSizing: 'border-box',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        gap: spacing.sm,
                        alignItems: 'flex-start',
                        minWidth: 0,
                      }}
                    >
                      <GroupChipsCell
                        groups={groupEntries}
                        item={item}
                        isExpanded={isExpanded}
                        onToggle={toggle}
                      />
                      <div style={{ flex: 1, minWidth: 0, overflowX: 'auto' }}>
                        <GroupFieldStrip
                          members={
                            findActiveGroupMembers(
                              groupEntries,
                              item.id,
                              isExpanded,
                            ) ?? []
                          }
                          item={item}
                          descriptorByField={descriptorByField}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: `1px solid ${colors.borderSubtle}` }}>
              <td
                colSpan={ungrouped.length + 1}
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
