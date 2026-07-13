import type { ReactNode } from 'react';

import { useTheme } from '../theme/ThemeContext';

type MobileFieldStackProps = {
  label: string;
  children: ReactNode;
  /** Tighter spacing for dense secondary fields */
  compact?: boolean;
};

export const MobileFieldStack = ({ label, children, compact = false }: MobileFieldStackProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? spacing.xs : spacing.sm,
        padding: compact ? `${spacing.xs} 0` : `${spacing.sm} 0`,
      }}
    >
      <div
        style={{
          fontSize: font.sizeXs,
          fontWeight: font.weightMedium,
          color: colors.textMuted,
          letterSpacing: '0.02em',
        }}
      >
        {label}
      </div>
      <div style={{ minWidth: 0, width: '100%' }}>{children}</div>
    </div>
  );
};
