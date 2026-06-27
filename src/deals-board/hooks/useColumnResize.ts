import { useCallback, useEffect, useRef, useState } from 'react';

import { getElementScaleX } from '../utils/dom';
import { DEFAULT_COLUMN_WIDTH } from '../utils/columns';
import type { ColumnConfig } from '../types';

export const MIN_COLUMN_WIDTH = 32;

type ActiveResize = {
  field: string;
  startX: number;
  startWidth: number;
  scaleX: number;
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
    (event: MouseEvent, field: string, startWidth: number, scaleSource?: HTMLElement | null) => {
      event.preventDefault();
      event.stopPropagation();

      isDraggingRef.current = true;
      onUserResizeRef.current?.();

      activeResizeRef.current = {
        field,
        startX: event.clientX,
        startWidth: Math.max(MIN_COLUMN_WIDTH, startWidth || DEFAULT_COLUMN_WIDTH),
        scaleX: getElementScaleX(scaleSource ?? (event.currentTarget as HTMLElement | null)),
      };
      setIsResizing(true);
    },
    [],
  );

  const handleResizeMove = useCallback((clientX: number) => {
    const activeResize = activeResizeRef.current;
    if (!activeResize) return;

    const delta = (clientX - activeResize.startX) / activeResize.scaleX;
    const nextWidth = Math.max(MIN_COLUMN_WIDTH, activeResize.startWidth + delta);

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

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (event: MouseEvent) => handleResizeMove(event.clientX);
    const onUp = () => finishResize();

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);

    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [finishResize, handleResizeMove, isResizing]);

  return {
    displayColumns,
    beginResize,
    handleResizeMove,
    finishResize,
    isResizing,
  };
};
