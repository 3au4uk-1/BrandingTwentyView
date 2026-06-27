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
};

export const ResizableColumnHeader = ({
  column,
  onResizeStart,
  stickyStyle,
  children,
  compact = false,
}: ResizableColumnHeaderProps) => {
  const theme = useTheme();
  const { colors, font, zIndex } = theme;
  const width = getColumnWidth(column);
  const headerRef = useRef<HTMLTableCellElement | null>(null);
  const handleRef = useRef<HTMLDivElement | null>(null);
  const onResizeStartRef = useRef(onResizeStart);

  onResizeStartRef.current = onResizeStart;

  useEffect(() => {
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
  }, [column.field, width]);

  return (
    <th
      ref={headerRef}
      style={{
        position: 'relative',
        padding: compact ? '8px 10px' : '10px 12px',
        textAlign: 'left',
        fontSize: font.sizeXs,
        fontWeight: font.weightSemibold,
        color: colors.textMuted,
        textTransform: compact ? 'none' : 'uppercase',
        letterSpacing: compact ? 'normal' : '0.04em',
        width: `${width}px`,
        maxWidth: `${width}px`,
        minWidth: `${width}px`,
        whiteSpace: 'nowrap',
        userSelect: 'none',
        boxSizing: 'border-box',
        ...(compact ? { backgroundColor: colors.bgTertiary } : {}),
        ...stickyStyle,
      }}
    >
      <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {children}
      </span>
      <div
        ref={handleRef}
        role="separator"
        aria-orientation="vertical"
        aria-label={`Изменить ширину колонки ${column.label}`}
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
    </th>
  );
};
