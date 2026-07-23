import { useExpandMode, type ExpandMode } from './hooks/useExpandMode';
import { useTheme } from './theme/ThemeContext';
import { SegmentControl } from './ui/SegmentControl';

const OPTIONS = [
  { value: 'smart' as ExpandMode, label: 'Умное' },
  { value: 'collapsed' as ExpandMode, label: 'Свёрнуто' },
];

export const ExpandModeToggle = () => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const { mode, setMode } = useExpandMode();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: font.sizeXs,
          color: colors.textMuted,
          whiteSpace: 'nowrap',
        }}
      >
        Раскрытие
      </span>
      <SegmentControl
        theme={theme}
        variant="muted"
        options={OPTIONS}
        value={mode}
        onChange={setMode}
        ariaLabel="Режим раскрытия сделок"
      />
    </div>
  );
};
