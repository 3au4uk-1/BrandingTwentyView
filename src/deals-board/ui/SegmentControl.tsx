import type { CSSProperties, ReactNode } from 'react';

import type { ThemeTokens } from '../theme/tokens';

type SegmentOption<T extends string> = {
  value: T;
  label: ReactNode;
};

type SegmentControlProps<T extends string> = {
  theme: ThemeTokens;
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  style?: CSSProperties;
  variant?: 'default' | 'muted';
};

export const SegmentControl = <T extends string>({
  theme,
  options,
  value,
  onChange,
  ariaLabel,
  style,
  variant = 'default',
}: SegmentControlProps<T>) => {
  const { colors, radius, font, spacing } = theme;
  const isMuted = variant === 'muted';

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        border: `1px solid ${isMuted ? colors.borderSubtle : colors.border}`,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: isMuted ? colors.bgTertiary : colors.bgElevated,
        ...style,
      }}
    >
      {options.map((option, index) => {
        const isActive = value === option.value;

        return (
          <button
            key={option.value}
            type="button"
            data-segment-btn
            data-active={isActive ? 'true' : 'false'}
            aria-pressed={isActive}
            onClick={() => onChange(option.value)}
            style={{
              border: 'none',
              borderRight: index < options.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
              padding: isMuted ? `3px ${spacing.xs}` : `${spacing.xs} ${spacing.sm}`,
              fontSize: isMuted ? font.sizeXs : font.sizeSm,
              fontFamily: font.family,
              fontWeight: isActive ? font.weightMedium : font.weightNormal,
              backgroundColor: isActive
                ? isMuted
                  ? colors.bgElevated
                  : colors.accentMuted
                : 'transparent',
              color: isActive
                ? isMuted
                  ? colors.textSecondary
                  : colors.accentText
                : colors.textMuted,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background-color 0.12s ease, color 0.12s ease',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
