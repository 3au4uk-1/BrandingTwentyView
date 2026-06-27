import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';

import type { ColumnConfig } from '../types';

const MIN_COLUMN_WIDTH = 60;

export const useColumnResize = (
  columns: ColumnConfig[],
  onSave: (columns: ColumnConfig[]) => void,
) => {
  const [displayColumns, setDisplayColumns] = useState(columns);
  const isDraggingRef = useRef(false);
  const latestColumnsRef = useRef(columns);
  const onSaveRef = useRef(onSave);

  onSaveRef.current = onSave;

  useEffect(() => {
    latestColumnsRef.current = displayColumns;
  }, [displayColumns]);

  useEffect(() => {
    if (isDraggingRef.current) return;
    setDisplayColumns(columns);
    latestColumnsRef.current = columns;
  }, [columns]);

  const handleResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>, field: string, startWidth: number) => {
      event.preventDefault();
      event.stopPropagation();

      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);

      isDraggingRef.current = true;
      const dragState = { field, startX: event.clientX, startWidth: startWidth || 120 };

      const onPointerMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== event.pointerId) return;

        const nextWidth = Math.max(
          MIN_COLUMN_WIDTH,
          dragState.startWidth + (moveEvent.clientX - dragState.startX),
        );

        setDisplayColumns((prev) => {
          const next = prev.map((column) =>
            column.field === dragState.field ? { ...column, width: nextWidth } : column,
          );
          latestColumnsRef.current = next;
          return next;
        });
      };

      const finishResize = (upEvent: PointerEvent) => {
        if (upEvent.pointerId !== event.pointerId) return;

        handle.removeEventListener('pointermove', onPointerMove);
        handle.removeEventListener('pointerup', finishResize);
        handle.removeEventListener('pointercancel', finishResize);

        if (handle.hasPointerCapture(event.pointerId)) {
          handle.releasePointerCapture(event.pointerId);
        }

        isDraggingRef.current = false;
        onSaveRef.current(latestColumnsRef.current);
      };

      handle.addEventListener('pointermove', onPointerMove);
      handle.addEventListener('pointerup', finishResize);
      handle.addEventListener('pointercancel', finishResize);
    },
    [],
  );

  return { displayColumns, handleResizePointerDown };
};
