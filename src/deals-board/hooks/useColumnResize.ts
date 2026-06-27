import { useCallback, useEffect, useRef, useState } from 'react';

import { DEFAULT_COLUMN_WIDTH } from '../utils/columns';
import type { ColumnConfig } from '../types';

const MIN_COLUMN_WIDTH = 60;

type ActiveResize = {
  field: string;
  startX: number;
  startWidth: number;
};

export const useColumnResize = (
  columns: ColumnConfig[],
  onSave: (columns: ColumnConfig[]) => void,
  onUserResize?: () => void,
) => {
  const [displayColumns, setDisplayColumns] = useState(columns);
  const [isResizing, setIsResizing] = useState(false);
  const activeResizeRef = useRef<ActiveResize | null>(null);
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

      isDraggingRef.current = true;
      onUserResizeRef.current?.();

      activeResizeRef.current = {
        field,
        startX: event.clientX,
        startWidth: Math.max(MIN_COLUMN_WIDTH, startWidth || DEFAULT_COLUMN_WIDTH),
      };
      setIsResizing(true);
    },
    [],
  );

  const handleResizeMove = useCallback((clientX: number) => {
    const activeResize = activeResizeRef.current;
    if (!activeResize) return;

    const nextWidth = Math.max(
      MIN_COLUMN_WIDTH,
      activeResize.startWidth + (clientX - activeResize.startX),
    );

    setDisplayColumns((prev) => {
      const next = prev.map((column) =>
        column.field === activeResize.field ? { ...column, width: nextWidth } : column,
      );
      latestColumnsRef.current = next;
      return next;
    });
  }, []);

  const finishResize = useCallback(() => {
    if (!activeResizeRef.current) return;

    activeResizeRef.current = null;
    isDraggingRef.current = false;
    setIsResizing(false);
    onSaveRef.current(latestColumnsRef.current);
  }, []);

  return {
    displayColumns,
    beginResize,
    handleResizeMove,
    finishResize,
    isResizing,
  };
};
