import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { useTheme } from '../theme/ThemeContext';
import { DEFAULT_COLUMN_WIDTH } from '../utils/columns';
import type { ColumnConfig } from '../types';

type ResizableColumnHeaderProps = {
  column: ColumnConfig;
  onResizePointerDown: (
    event: ReactPointerEvent<HTMLDivElement>,
    field: string,
    startWidth: number,
  ) => void;
  stickyStyle?: CSSProperties;
  children: ReactNode;
  compact?: boolean;
};

export const ResizableColumnHeader = ({
  column,
  onResizePointerDown,
  stickyStyle,
  children,
  compact = false,
}: ResizableColumnHeaderProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const width = column.width ?? DEFAULT_COLUMN_WIDTH;

  return (
    <th
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
        role="separator"
        aria-orientation="vertical"
        aria-label={`Изменить ширину колонки ${column.label}`}
        onPointerDown={(event) => onResizePointerDown(event, column.field, width)}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '10px',
          height: '100%',
          cursor: 'col-resize',
          touchAction: 'none',
          zIndex: 1,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20%',
            bottom: '20%',
            right: '4px',
            width: '2px',
            backgroundColor: colors.borderStrong,
            opacity: 0.75,
            pointerEvents: 'none',
          }}
        />
      </div>
    </th>
  );
};
