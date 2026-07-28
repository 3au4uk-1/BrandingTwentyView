import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react';

import { useTheme } from '../theme/ThemeContext';
import { getColumnWidth } from '../utils/columns';
import type { ColumnConfig } from '../types';

type ResizableColumnHeaderProps = {
  column: ColumnConfig;
  onResizeStart: (
    event: MouseEvent | PointerEvent,
    field: string,
    startWidth: number,
    scaleSource?: HTMLElement | null,
    captureTarget?: HTMLElement | null,
  ) => void;
  stickyStyle?: CSSProperties;
  children: ReactNode;
  compact?: boolean;
  sortDirection?: false | 'asc' | 'desc';
  onHeaderClick?: () => void;
  disableResize?: boolean;
};

export const ResizableColumnHeader = ({
  column,
  onResizeStart,
  stickyStyle,
  children,
  compact = false,
  sortDirection = false,
  onHeaderClick,
  disableResize = false,
}: ResizableColumnHeaderProps) => {
  const theme = useTheme();
  const { colors, font, zIndex } = theme;
  const width = getColumnWidth(column);
  const headerRef = useRef<HTMLTableCellElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const onResizeStartRef = useRef(onResizeStart);

  onResizeStartRef.current = onResizeStart;

  useEffect(() => {
    if (disableResize) return;

    const handle = handleRef.current;
    if (!handle) return;

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      onResizeStartRef.current(event, column.field, width, headerRef.current, handle);
    };

    const onMouseDown = (event: MouseEvent) => {
      if (event.button !== 0) return;
      onResizeStartRef.current(event, column.field, width, headerRef.current, handle);
    };

    if (typeof window !== 'undefined' && 'PointerEvent' in window) {
      handle.addEventListener('pointerdown', onPointerDown);
      return () => handle.removeEventListener('pointerdown', onPointerDown);
    }

    handle.addEventListener('mousedown', onMouseDown);
    return () => handle.removeEventListener('mousedown', onMouseDown);
  }, [column.field, disableResize, width]);

  const sortIndicator =
    sortDirection === 'asc' ? ' ↑' : sortDirection === 'desc' ? ' ↓' : '';

  return (
    <th
      ref={headerRef}
      onClick={onHeaderClick}
      aria-sort={
        sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : undefined
      }
      style={{
        position: 'relative',
        padding: compact ? '7px 10px' : '8px 12px',
        textAlign: 'left',
        fontSize: font.sizeXs,
        fontWeight: font.weightMedium,
        color: colors.textMuted,
        textTransform: 'none',
        letterSpacing: '-0.01em',
        width: `${width}px`,
        maxWidth: `${width}px`,
        minWidth: `${width}px`,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        boxSizing: 'border-box',
        cursor: onHeaderClick ? 'pointer' : undefined,
        ...(compact ? { backgroundColor: colors.bgTertiary } : { backgroundColor: colors.bgSecondary }),
        ...stickyStyle,
      }}
    >
      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {children}
        {sortIndicator}
      </span>
      {!disableResize ? (
        <div
          ref={handleRef}
          role="separator"
          aria-orientation="vertical"
          aria-label={`Изменить ширину колонки ${column.label}`}
          onClick={(event) => event.stopPropagation()}
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: '12px',
            height: '100%',
            cursor: 'col-resize',
            touchAction: 'none',
            zIndex: zIndex.dropdown,
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '18%',
              bottom: '18%',
              right: '5px',
              width: '2px',
              backgroundColor: colors.borderStrong,
              opacity: 0.85,
              pointerEvents: 'none',
            }}
          />
        </div>
      ) : null}
    </th>
  );
};
