import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_COLUMN_WIDTH, getColumnWidth } from '../utils/columns';
import type { ColumnConfig } from '../types';

const MIN_COLUMN_WIDTH = 60;

export type ColumnResizeStartEvent = {
  clientX: number;
  currentTarget: HTMLDivElement;
  preventDefault: () => void;
  stopPropagation: () => void;
};

export const useColumnResize = (
  columns: ColumnConfig[],
  onSave: (columns: ColumnConfig[]) => void,
  onUserResize?: () => void,
) => {
  const [displayColumns, setDisplayColumns] = useState(columns);
  const isDraggingRef = useRef(false);
  const latestColumnsRef = useRef(columns);
  const onSaveRef = useRef(onSave);
  const onUserResizeRef = useRef(onUserResize);

  onSaveRef.current = onSave;
  onUserResizeRef.current = onUserResize;

  useEffect(() => {
    latestColumnsRef.current = displayColumns;
  }, [displayColumns]);

  useEffect(() => {
    if (isDraggingRef.current) return;
    setDisplayColumns(columns);
    latestColumnsRef.current = columns;
  }, [columns]);

  const beginResize = useCallback(
    (event: ColumnResizeStartEvent, field: string, startWidth: number) => {
      event.preventDefault();
      event.stopPropagation();

      const headerCell = event.currentTarget.closest('th');
      const measuredWidth = headerCell?.getBoundingClientRect().width ?? startWidth;
      const doc = event.currentTarget.ownerDocument;
      const win = doc.defaultView ?? window;

      isDraggingRef.current = true;
      onUserResizeRef.current?.();

      const dragState = {
        field,
        startX: event.clientX,
        startWidth: Math.max(MIN_COLUMN_WIDTH, measuredWidth || startWidth || DEFAULT_COLUMN_WIDTH),
      };

      const onMouseMove = (moveEvent: MouseEvent) => {
        moveEvent.preventDefault();

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

      const finishResize = () => {
        win.removeEventListener('mousemove', onMouseMove, true);
        win.removeEventListener('mouseup', finishResize, true);
        doc.body.style.cursor = '';
        doc.body.style.userSelect = '';
        isDraggingRef.current = false;
        onSaveRef.current(latestColumnsRef.current);
      };

      doc.body.style.cursor = 'col-resize';
      doc.body.style.userSelect = 'none';
      win.addEventListener('mousemove', onMouseMove, true);
      win.addEventListener('mouseup', finishResize, true);
    },
    [],
  );

  return { displayColumns, beginResize };
};
