import type { CSSProperties, ReactNode } from 'react';

import { useTheme } from '../theme/ThemeContext';
import type { ColumnConfig } from '../types';

type ResizableColumnHeaderProps = {
  column: ColumnConfig;
  onResizeStart: (field: string, clientX: number, startWidth: number) => void;
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
  const { colors, font } = theme;
  const width = column.width ?? 120;

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
        onMouseDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onResizeStart(column.field, event.clientX, width);
        }}
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '8px',
          height: '100%',
          cursor: 'col-resize',
          touchAction: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20%',
            bottom: '20%',
            right: '3px',
            width: '1px',
            backgroundColor: colors.borderStrong,
            opacity: 0.6,
          }}
        />
      </div>
    </th>
  );
};
