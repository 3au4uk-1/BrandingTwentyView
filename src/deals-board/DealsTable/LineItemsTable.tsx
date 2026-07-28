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
import type { BoardStream } from 'src/constants/product-stream';
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
  planPoryadokPatches,
  sortLineItemsByOrder,
} from '../utils/line-item-order';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';

import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';
import { lineItemDragSession } from './line-item-drag-session';
import { ResizableColumnHeader } from './ResizableColumnHeader';

const GROUP_ZONE_MIN_WIDTH = 280;
const DEFAULT_ROW_HEIGHT_PX = 40;

type DragSession = {
  fromId: string;
  fromIndex: number;
  startY: number;
  startIds: string[];
  startRowsById: Map<string, LineItemRow>;
  rowHeight: number;
  lastToIndex: number;
  pointerId: number | null;
};

type DragListeners = {
  doc: Document;
  view: Window | null;
  onPointerMove: (event: PointerEvent) => void;
  onMouseMove: (event: MouseEvent) => void;
  onPointerUp: (event: Event) => void;
  onMouseUp: (event: Event) => void;
  onPointerCancel: (event: Event) => void;
};

/** Same pattern as ResizableColumnHeader: native listeners (sandbox-safe). */
const OrderDragHandle = ({
  itemId,
  isActive,
  disabled,
  onDragStart,
}: {
  itemId: string;
  isActive: boolean;
  disabled: boolean;
  onDragStart: (event: MouseEvent | PointerEvent, itemId: string, handle: HTMLElement) => void;
}) => {
  const theme = useTheme();
  const { colors, radius } = theme;
  const handleRef = useRef<HTMLDivElement | null>(null);
  const onDragStartRef = useRef(onDragStart);
  onDragStartRef.current = onDragStart;

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle || disabled) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      onDragStartRef.current(event, itemId, handle);
    };
    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      onDragStartRef.current(event, itemId, handle);
    };

    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      handle.addEventListener('pointerdown', onPointerDown);
      return () => handle.removeEventListener('pointerdown', onPointerDown);
    }

    handle.addEventListener('mousedown', onMouseDown);
    return () => handle.removeEventListener('mousedown', onMouseDown);
  }, [disabled, itemId]);

  return (
    <div
      ref={handleRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Перетащить для изменения порядка"
      title="Перетащить"
      style={{
        width: 22,
        height: 28,
        padding: 0,
        border: 'none',
        borderRadius: radius.sm,
        background: isActive ? colors.bgTertiary : 'transparent',
        color: colors.textSecondary,
        cursor: disabled ? 'default' : isActive ? 'grabbing' : 'grab',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 14,
        lineHeight: 1,
        letterSpacing: '-1px',
        opacity: disabled ? 0.4 : 0.85,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      ⠿
    </div>
  );
};

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
  boardStream?: BoardStream;
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
  boardStream,
}: LineItemsTableProps) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { colors, font, spacing, radius, colorScheme } = theme;
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const tbodyRef = useRef<HTMLTableSectionElement | null>(null);
  const dragSessionRef = useRef<DragSession | null>(null);
  const dragListenersRef = useRef<DragListeners | null>(null);
  const displayItemsRef = useRef<LineItemRow[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const [statusMessage, setStatusMessage] = useState<{
    kind: 'warning' | 'error';
    text: string;
  } | null>(null);
  const isHiddenByFilters = isDefaultLineItemHiddenByFilters(filters);
  const isDragging = draggingId !== null;

  const sortedItems = useMemo(() => sortLineItemsByOrder(items), [items]);
  const displayItems = orderedItems ?? sortedItems;
  displayItemsRef.current = displayItems;
  const itemsOrderSignature = useMemo(
    () => items.map((item) => `${item.id}:${item.poryadok ?? ''}`).join('|'),
    [items],
  );

  useEffect(() => {
    if (dragSessionRef.current) return;
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
    const sourceRows = itemsRef.current;
    const byId = new Map(sourceRows.map((item) => [item.id, item]));
    const nextRows = nextIds
      .map((id, index) => {
        const row = byId.get(id) ?? displayItemsRef.current.find((item) => item.id === id);
        return row ? { ...row, poryadok: index } : null;
      })
      .filter((row): row is LineItemRow => row !== null);

    setOrderedItems(nextRows);

    const patches = planPoryadokPatches(nextIds, byId);
    if (patches.length === 0) return;

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

  const applyLiveFromClientY = (clientY: number) => {
    const session = dragSessionRef.current;
    if (!session) return;

    const rowHeight = session.rowHeight > 0 ? session.rowHeight : DEFAULT_ROW_HEIGHT_PX;
    const steps = Math.round((clientY - session.startY) / rowHeight);
    const toIndex = Math.max(
      0,
      Math.min(session.startIds.length - 1, session.fromIndex + steps),
    );
    if (toIndex === session.lastToIndex) return;
    session.lastToIndex = toIndex;

    const nextIds = [...session.startIds];
    nextIds.splice(session.fromIndex, 1);
    nextIds.splice(toIndex, 0, session.fromId);

    const highlightId =
      toIndex === session.fromIndex ? null : session.startIds[toIndex] ?? null;
    setDragOverId(highlightId);

    setOrderedItems(
      nextIds
        .map((id, index) => {
          const row = session.startRowsById.get(id);
          return row ? { ...row, poryadok: index } : null;
        })
        .filter((row): row is LineItemRow => row !== null),
    );
  };

  const detachDragListeners = () => {
    const listeners = dragListenersRef.current;
    if (!listeners) return;
    const { doc, view, onPointerMove, onMouseMove, onPointerUp, onMouseUp, onPointerCancel } =
      listeners;
    doc.removeEventListener('pointermove', onPointerMove, true);
    doc.removeEventListener('mousemove', onMouseMove, true);
    doc.removeEventListener('pointerup', onPointerUp, true);
    doc.removeEventListener('mouseup', onMouseUp, true);
    doc.removeEventListener('pointercancel', onPointerCancel, true);
    if (view) {
      view.removeEventListener('pointermove', onPointerMove, true);
      view.removeEventListener('mousemove', onMouseMove, true);
      view.removeEventListener('pointerup', onPointerUp, true);
      view.removeEventListener('mouseup', onMouseUp, true);
      view.removeEventListener('pointercancel', onPointerCancel, true);
    }
    dragListenersRef.current = null;
  };

  const cancelPointerDrag = () => {
    dragSessionRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
    setOrderedItems(null);
    detachDragListeners();
    lineItemDragSession.set(null);
  };

  const endPointerDrag = async () => {
    const session = dragSessionRef.current;
    if (!session) return;
    dragSessionRef.current = null;
    setDraggingId(null);
    setDragOverId(null);
    detachDragListeners();
    lineItemDragSession.set(null);
    const nextIds = displayItemsRef.current.map((item) => item.id);
    await commitOrder(nextIds);
  };

  const startPointerDrag = (
    event: MouseEvent | PointerEvent,
    fromId: string,
    handle: HTMLElement,
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const startIds = displayItemsRef.current.map((item) => item.id);
    const fromIndex = startIds.indexOf(fromId);
    if (fromIndex < 0) return;

    detachDragListeners();
    lineItemDragSession.set(null);

    const rowEl = tbodyRef.current?.querySelector<HTMLElement>(
      `tr[data-line-item-id="${fromId}"]`,
    );
    const rowHeight = rowEl?.getBoundingClientRect().height || DEFAULT_ROW_HEIGHT_PX;

    dragSessionRef.current = {
      fromId,
      fromIndex,
      startY: event.clientY,
      startIds,
      startRowsById: new Map(displayItemsRef.current.map((item) => [item.id, item])),
      rowHeight,
      lastToIndex: fromIndex,
      pointerId: 'pointerId' in event ? event.pointerId : null,
    };
    setDraggingId(fromId);
    setDragOverId(null);
    setStatusMessage(null);

    lineItemDragSession.set({
      onMove: applyLiveFromClientY,
      onEnd: () => {
        void endPointerDrag();
      },
      onCancel: cancelPointerDrag,
    });

    // Twenty sandbox: setPointerCapture often missing; global `window` may not
    // receive moves. Mirror column-resize: ownerDocument + board scroll container.
    const doc = handle.ownerDocument;
    const view = doc.defaultView;

    const onPointerMove = (moveEvent: PointerEvent) => {
      const session = dragSessionRef.current;
      if (!session) return;
      if (session.pointerId !== null && moveEvent.pointerId !== session.pointerId) return;
      moveEvent.preventDefault();
      applyLiveFromClientY(moveEvent.clientY);
    };
    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!dragSessionRef.current) return;
      applyLiveFromClientY(moveEvent.clientY);
    };
    const onUp = () => {
      void endPointerDrag();
    };
    const onCancel = () => {
      cancelPointerDrag();
    };

    dragListenersRef.current = {
      doc,
      view,
      onPointerMove,
      onMouseMove,
      onPointerUp: onUp,
      onMouseUp: onUp,
      onPointerCancel: onCancel,
    };

    doc.addEventListener('pointermove', onPointerMove, true);
    doc.addEventListener('mousemove', onMouseMove, true);
    doc.addEventListener('pointerup', onUp, true);
    doc.addEventListener('mouseup', onUp, true);
    doc.addEventListener('pointercancel', onCancel, true);
    if (view) {
      view.addEventListener('pointermove', onPointerMove, true);
      view.addEventListener('mousemove', onMouseMove, true);
      view.addEventListener('pointerup', onUp, true);
      view.addEventListener('mouseup', onUp, true);
      view.addEventListener('pointercancel', onCancel, true);
    }
  };

  useEffect(
    () => () => {
      detachDragListeners();
      lineItemDragSession.set(null);
    },
    [],
  );

  return (
    <div
      onPointerMove={(event) => {
        if (!isDragging) return;
        applyLiveFromClientY(event.clientY);
      }}
      onMouseMove={(event) => {
        if (!isDragging) return;
        applyLiveFromClientY(event.clientY);
      }}
      onPointerUp={() => {
        if (!isDragging) return;
        void endPointerDrag();
      }}
      onPointerCancel={() => {
        if (!isDragging) return;
        cancelPointerDrag();
      }}
      onMouseUp={() => {
        if (!isDragging) return;
        void endPointerDrag();
      }}
      style={{
        padding: `${spacing.sm} ${spacing.md} ${spacing.sm} ${spacing.sm}`,
        borderTop: `1px solid ${colors.borderSubtle}`,
        userSelect: isDragging ? 'none' : undefined,
        cursor: isDragging ? 'grabbing' : undefined,
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
          borderLeft: `3px solid ${colors.borderSubtle}`,
          paddingLeft: spacing.md,
          marginLeft: 0,
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
            width: '100%',
            backgroundColor: colors.bgElevated,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: radius.md,
            overflow: 'hidden',
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
                  padding: '8px 4px',
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
                  padding: '8px 12px',
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
          <tbody ref={tbodyRef}>
            {displayItems.map((item, rowIndex) => {
              const stageValue = typeof item.stage === 'string' ? item.stage : null;
              const stageStyles = getStageRowStyles(stageValue, colorScheme, 'child');
              const rowBg = stageStyles.backgroundColor || colors.bgElevated;
              const isDragging = draggingId === item.id;
              const isDropTarget = dragOverId === item.id && draggingId !== null && draggingId !== item.id;

              return (
                <tr
                  key={item.id}
                  data-line-item-row=""
                  data-line-item-id={item.id}
                  style={{
                    borderBottom:
                      rowIndex < displayItems.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                    backgroundColor: rowBg,
                    boxShadow: isDropTarget
                      ? `inset 0 2px 0 ${colors.accent}`
                      : stageStyles.boxShadow,
                    opacity: isDragging ? 0.55 : 1,
                    transition: draggingId
                      ? 'opacity 0.12s ease'
                      : 'background-color 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.15s ease',
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
                      touchAction: 'none',
                    }}
                  >
                    <OrderDragHandle
                      itemId={item.id}
                      isActive={isDragging}
                      disabled={false}
                      onDragStart={startPointerDrag}
                    />
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
                          padding: '8px 12px',
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
                          boardStream={boardStream}
                        />
                      </td>
                    );
                  })}
                  <td
                    style={{
                      minWidth: `${GROUP_ZONE_MIN_WIDTH}px`,
                      maxWidth: '50%',
                      padding: '8px 12px',
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
                          boardStream={boardStream}
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
