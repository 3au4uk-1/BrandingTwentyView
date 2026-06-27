import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react';

import type { ThemeTokens } from '../theme/tokens';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  theme: ThemeTokens;
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
  children: ReactNode;
};

const getVariantStyles = (theme: ThemeTokens, variant: ButtonVariant): CSSProperties => {
  const { colors, radius, font } = theme;

  switch (variant) {
    case 'primary':
      return {
        backgroundColor: colors.accent,
        color: colors.textInverse,
        border: `1px solid ${colors.accent}`,
      };
    case 'danger':
      return {
        backgroundColor: colors.dangerMuted,
        color: colors.danger,
        border: `1px solid transparent`,
      };
    case 'ghost':
      return {
        backgroundColor: 'transparent',
        color: colors.textSecondary,
        border: '1px solid transparent',
      };
    default:
      return {
        backgroundColor: colors.bgElevated,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      };
  }
};

export const Button = ({
  theme,
  variant = 'secondary',
  size = 'md',
  children,
  disabled,
  style,
  ...props
}: ButtonProps) => {
  const { font, radius, spacing } = theme;
  const padding = size === 'sm' ? '5px 10px' : '7px 12px';
  const fontSize = size === 'sm' ? font.sizeSm : font.sizeMd;

  return (
    <button
      type="button"
      data-btn-variant={variant}
      disabled={disabled}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        padding,
        fontSize,
        fontWeight: font.weightMedium,
        fontFamily: font.family,
        borderRadius: radius.md,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        whiteSpace: 'nowrap',
        lineHeight: 1.2,
        transition: 'background-color 0.15s ease, border-color 0.15s ease, transform 0.1s ease',
        ...getVariantStyles(theme, variant),
        ...style,
      }}
      {...props}
    >
      {children}
    </button>
  );
};
