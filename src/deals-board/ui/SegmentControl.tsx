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
        gap: 2,
        padding: 2,
        border: 'none',
        borderRadius: radius.md,
        backgroundColor: isMuted ? colors.bgTertiary : colors.bgInset,
        ...style,
      }}
    >
      {options.map((option) => {
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
              borderRadius: radius.sm,
              padding: isMuted ? `3px ${spacing.xs}` : `5px ${spacing.sm}`,
              fontSize: isMuted ? font.sizeXs : font.sizeSm,
              fontFamily: font.family,
              fontWeight: isActive ? font.weightSemibold : font.weightMedium,
              letterSpacing: '-0.01em',
              backgroundColor: isActive ? colors.bgElevated : 'transparent',
              color: isActive ? colors.text : colors.textMuted,
              boxShadow: isActive ? colors.shadow : 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
