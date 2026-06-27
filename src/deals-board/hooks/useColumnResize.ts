import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_COLUMN_WIDTH } from '../utils/columns';
import type { ColumnConfig } from '../types';

const MIN_COLUMN_WIDTH = 60;

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
    (event: MouseEvent, field: string, startWidth: number) => {
      event.preventDefault();
      event.stopPropagation();

      const target = event.currentTarget;
      const ownerDocument =
        target && typeof (target as Node).ownerDocument !== 'undefined'
          ? (target as Node).ownerDocument
          : document;
      const win = ownerDocument.defaultView ?? window;

      isDraggingRef.current = true;
      onUserResizeRef.current?.();

      const dragState = {
        field,
        startX: event.clientX,
        startWidth: Math.max(MIN_COLUMN_WIDTH, startWidth || DEFAULT_COLUMN_WIDTH),
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
        ownerDocument.body.style.cursor = '';
        ownerDocument.body.style.userSelect = '';
        isDraggingRef.current = false;
        onSaveRef.current(latestColumnsRef.current);
      };

      ownerDocument.body.style.cursor = 'col-resize';
      ownerDocument.body.style.userSelect = 'none';
      win.addEventListener('mousemove', onMouseMove, true);
      win.addEventListener('mouseup', finishResize, true);
    },
    [],
  );

  return { displayColumns, beginResize };
};
