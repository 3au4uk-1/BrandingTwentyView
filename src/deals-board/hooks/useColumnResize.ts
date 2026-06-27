import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

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

  const beginResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>, field: string, startWidth: number) => {
      event.preventDefault();
      event.stopPropagation();

      isDraggingRef.current = true;
      const dragState = { field, startX: event.clientX, startWidth: startWidth || 120 };

      const onMouseMove = (moveEvent: MouseEvent) => {
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

      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        isDraggingRef.current = false;
        onSaveRef.current(latestColumnsRef.current);
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    },
    [],
  );

  return { displayColumns, beginResize };
};
