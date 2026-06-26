import type { ThemeTokens } from '../theme/tokens';

type SpinnerProps = {
  theme: ThemeTokens;
  label?: string;
};

export const Spinner = ({ theme, label = 'Загрузка...' }: SpinnerProps) => (
  <div
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.md,
      color: theme.colors.textMuted,
      fontSize: theme.font.sizeSm,
    }}
  >
    <div
      style={{
        width: '28px',
        height: '28px',
        borderRadius: '50%',
        border: `2px solid ${theme.colors.border}`,
        borderTopColor: theme.colors.accent,
        animation: 'deals-board-spin 0.7s linear infinite',
      }}
    />
    <span>{label}</span>
    <style>{`@keyframes deals-board-spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);
