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
};

export const SegmentControl = <T extends string>({
  theme,
  options,
  value,
  onChange,
  ariaLabel,
  style,
}: SegmentControlProps<T>) => {
  const { colors, radius, font, spacing } = theme;

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: colors.bgElevated,
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
              borderRight: index < options.length - 1 ? `1px solid ${colors.border}` : 'none',
              padding: `${spacing.xs} ${spacing.sm}`,
              fontSize: font.sizeSm,
              fontFamily: font.family,
              fontWeight: isActive ? font.weightMedium : font.weightNormal,
              backgroundColor: isActive ? colors.accentMuted : 'transparent',
              color: isActive ? colors.accentText : colors.textSecondary,
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
