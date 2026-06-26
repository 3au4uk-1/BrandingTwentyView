import { useExpandMode, type ExpandMode } from './hooks/useExpandMode';
import { useTheme } from './theme/ThemeContext';

const OPTIONS: Array<{ value: ExpandMode; label: string }> = [
  { value: 'smart', label: 'Умное' },
  { value: 'collapsed', label: 'Свёрнуто' },
];

export const ExpandModeToggle = () => {
  const theme = useTheme();
  const { mode, setMode } = useExpandMode();
  const { colors, radius, font, spacing } = theme;

  return (
    <div
      role="group"
      aria-label="Режим раскрытия сделок"
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.md,
        overflow: 'hidden',
        backgroundColor: colors.bgElevated,
      }}
    >
      {OPTIONS.map((option, index) => {
        const isActive = mode === option.value;

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => setMode(option.value)}
            aria-pressed={isActive}
            style={{
              border: 'none',
              borderRight: index < OPTIONS.length - 1 ? `1px solid ${colors.border}` : 'none',
              padding: `${spacing.xs} ${spacing.sm}`,
              fontSize: font.sizeSm,
              fontFamily: font.family,
              fontWeight: isActive ? font.weightMedium : font.weightNormal,
              backgroundColor: isActive ? colors.accentMuted : 'transparent',
              color: isActive ? colors.accentText : colors.textSecondary,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};
