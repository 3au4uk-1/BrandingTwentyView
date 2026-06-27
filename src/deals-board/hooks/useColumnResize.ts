import { useCallback, useEffect, useRef, useState } from 'react';

import type { ColumnConfig } from '../types';

const MIN_COLUMN_WIDTH = 60;

export const useColumnResize = (
  columns: ColumnConfig[],
  onSave: (columns: ColumnConfig[]) => void,
) => {
  const [displayColumns, setDisplayColumns] = useState(columns);
  const latestColumnsRef = useRef(columns);

  useEffect(() => {
    setDisplayColumns(columns);
    latestColumnsRef.current = columns;
  }, [columns]);

  useEffect(() => {
    latestColumnsRef.current = displayColumns;
  }, [displayColumns]);

  const beginResize = useCallback((field: string, clientX: number, startWidth: number) => {
    const dragState = { field, startX: clientX, startWidth: startWidth || 120 };

    const onMouseMove = (event: MouseEvent) => {
      const nextWidth = Math.max(
        MIN_COLUMN_WIDTH,
        dragState.startWidth + (event.clientX - dragState.startX),
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
      onSave(latestColumnsRef.current);
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [onSave]);

  return { displayColumns, beginResize };
};
