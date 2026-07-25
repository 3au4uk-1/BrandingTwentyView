import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  isDefaultLineItemHiddenByFilters,
  updateLineItem,
  type LineItemQueryFilters,
} from '../api/line-items';
import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import { GroupChipsCell } from '../cells/GroupChipsCell';
import { GroupFieldStrip } from '../cells/GroupFieldStrip';
import { useCreateLineItem } from '../hooks/useLineItems';
import { useLineItemGroupExpand } from '../hooks/useLineItemGroupExpand';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { getColumnWidth, getTableLayoutStyle, sumColumnWidths } from '../utils/columns';
import {
  buildChildLayoutColumns,
  getVisibleFieldsForChildLayoutEntry,
  partitionUngroupedAndGroups,
} from '../utils/column-groups';
import { findActiveGroupMembers } from '../utils/active-group';
import {
  moveItemInOrder,
  planPoryadokPatches,
  sortLineItemsByOrder,
} from '../utils/line-item-order';
import { resolveFieldValue } from '../utils/resolve-field-value';

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
  hasLineItemFilters?: boolean;
  showAllPositions?: boolean;
  onToggleShowAllPositions?: () => void;
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
  hasLineItemFilters = false,
  showAllPositions = false,
  onToggleShowAllPositions,
  onColumnResizeStart,
}: LineItemsTableProps) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { colors, font, spacing, radius } = theme;
  const layout = buildChildLayoutColumns(columns, groups);
  const { ungrouped, groupEntries } = partitionUngroupedAndGroups(layout);
  const tableStyle = getTableLayoutStyle(
    ungrouped,
    sumColumnWidths(ungrouped) + GROUP_ZONE_MIN_WIDTH + 36,
  );
  const createLineItem = useCreateLineItem();
  const { isExpanded, toggle } = useLineItemGroupExpand();
  const isCreatingRef = useRef(false);
  const [orderedItems, setOrderedItems] = useState<LineItemRow[] | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    kind: 'warning' | 'error';
    text: string;
  } | null>(null);
  const isHiddenByFilters = isDefaultLineItemHiddenByFilters(filters);

  const sortedItems = useMemo(() => sortLineItemsByOrder(items), [items]);
  const displayItems = orderedItems ?? sortedItems;
  const itemsOrderSignature = useMemo(
    () => items.map((item) => `${item.id}:${item.poryadok ?? ''}`).join('|'),
    [items],
  );

  useEffect(() => {
    setOrderedItems(null);
  }, [itemsOrderSignature]);

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

  const commitOrder = async (nextIds: string[]) => {
    const byId = new Map(displayItems.map((item) => [item.id, item]));
    const nextRows = nextIds
      .map((id, index) => {
        const row = byId.get(id);
        return row ? { ...row, poryadok: index } : null;
      })
      .filter((row): row is LineItemRow => row !== null);

    setOrderedItems(nextRows);

    const patches = planPoryadokPatches(nextIds, byId);
    try {
      await Promise.all(patches.map((patch) => updateLineItem(patch.id, patch.data)));
      await queryClient.invalidateQueries({ queryKey: ['lineItems'] });
    } catch (error) {
      setOrderedItems(null);
      setStatusMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Не удалось сохранить порядок',
      });
    }
  };

  const moveByOffset = async (fromId: string, offset: -1 | 1) => {
    const currentIds = displayItems.map((item) => item.id);
    const fromIndex = currentIds.indexOf(fromId);
    const toIndex = fromIndex + offset;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= currentIds.length) return;
    const toId = currentIds[toIndex];
    if (!toId) return;
    const nextIds = moveItemInOrder(currentIds, fromId, toId);
    if (nextIds) await commitOrder(nextIds);
  };

  return (
    <div
      style={{
        padding: `${spacing.sm} ${spacing.md} ${spacing.sm} 40px`,
        borderTop: `1px solid ${colors.borderSubtle}`,
      }}
    >
      {hasLineItemFilters && onToggleShowAllPositions ? (
        <div style={{ marginBottom: spacing.xs }}>
          <Button
            theme={theme}
            variant="ghost"
            size="sm"
            onClick={onToggleShowAllPositions}
          >
            {showAllPositions ? 'Только совпадения' : 'Показать все позиции'}
          </Button>
        </div>
      ) : null}
      <div
        style={{
          borderLeft: `3px solid ${colors.borderStrong}`,
          paddingLeft: spacing.lg,
          marginLeft: spacing.sm,
          borderRadius: `0 ${radius.md} ${radius.md} 0`,
          backgroundColor: colors.bgInset,
          boxShadow: `inset 0 1px 0 ${colors.borderSubtle}`,
        }}
      >
        <table
          style={{
            ...tableStyle,
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            backgroundColor: colors.bgElevated,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            overflow: 'hidden',
            boxShadow: colors.shadow,
          }}
        >
          <colgroup>
            <col style={{ width: '36px' }} />
            {ungrouped.map((column) => (
              <col key={column.field} style={{ width: `${getColumnWidth(column)}px` }} />
            ))}
            <col style={{ width: '50%' }} />
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}`, backgroundColor: colors.bgTertiary }}>
              <th
                scope="col"
                aria-label="Порядок"
                style={{
                  width: 28,
                  padding: '6px 4px',
                  color: colors.textMuted,
                  fontSize: font.sizeXs,
                }}
              />
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
            {displayItems.map((item, rowIndex) => {
              const canMoveUp = rowIndex > 0;
              const canMoveDown = rowIndex < displayItems.length - 1;

              return (
                <tr
                  key={item.id}
                  data-line-item-row=""
                  style={{
                    borderBottom:
                      rowIndex < displayItems.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                    backgroundColor: colors.bgElevated,
                    transition: 'background-color 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
                  }}
                >
                  <td
                    style={{
                      width: 36,
                      padding: '4px 2px',
                      verticalAlign: 'middle',
                      textAlign: 'center',
                      color: colors.textMuted,
                      userSelect: 'none',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <button
                        type="button"
                        aria-label="Выше"
                        title="Выше"
                        disabled={!canMoveUp}
                        onClick={() => void moveByOffset(item.id, -1)}
                        style={{
                          width: 22,
                          height: 16,
                          padding: 0,
                          border: `1px solid ${colors.border}`,
                          borderRadius: radius.sm,
                          background: colors.bgElevated,
                          color: canMoveUp ? colors.text : colors.textMuted,
                          cursor: canMoveUp ? 'pointer' : 'default',
                          fontSize: 10,
                          lineHeight: 1,
                          opacity: canMoveUp ? 1 : 0.4,
                        }}
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        aria-label="Ниже"
                        title="Ниже"
                        disabled={!canMoveDown}
                        onClick={() => void moveByOffset(item.id, 1)}
                        style={{
                          width: 22,
                          height: 16,
                          padding: 0,
                          border: `1px solid ${colors.border}`,
                          borderRadius: radius.sm,
                          background: colors.bgElevated,
                          color: canMoveDown ? colors.text : colors.textMuted,
                          cursor: canMoveDown ? 'pointer' : 'default',
                          fontSize: 10,
                          lineHeight: 1,
                          opacity: canMoveDown ? 1 : 0.4,
                        }}
                      >
                        ▼
                      </button>
                    </div>
                  </td>
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
                colSpan={ungrouped.length + 2}
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
