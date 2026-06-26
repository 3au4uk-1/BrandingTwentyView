import type { ReactNode } from 'react';

import type { ThemeTokens } from '../theme/tokens';
import { Button } from './Button';

type EmptyStateProps = {
  theme: ThemeTokens;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  icon?: ReactNode;
};

export const EmptyState = ({ theme, title, description, action, icon }: EmptyStateProps) => (
  <div
    style={{
      flex: 1,
      minHeight: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
      padding: theme.spacing.xl,
      textAlign: 'center',
    }}
  >
    {icon ? (
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: theme.radius.lg,
          backgroundColor: theme.colors.bgTertiary,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: theme.colors.textMuted,
        }}
      >
        {icon}
      </div>
    ) : null}
    <div style={{ fontSize: theme.font.sizeMd, fontWeight: theme.font.weightSemibold, color: theme.colors.text }}>
      {title}
    </div>
    {description ? (
      <p
        style={{
          margin: 0,
          maxWidth: '360px',
          fontSize: theme.font.sizeSm,
          color: theme.colors.textMuted,
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
    ) : null}
    {action ? (
      <Button theme={theme} variant="secondary" size="sm" onClick={action.onClick}>
        {action.label}
      </Button>
    ) : null}
  </div>
);
