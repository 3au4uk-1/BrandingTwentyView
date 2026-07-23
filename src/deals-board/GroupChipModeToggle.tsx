import { useGroupChipMode, type GroupChipMode } from './hooks/useGroupChipMode';
import { useTheme } from './theme/ThemeContext';
import { SegmentControl } from './ui/SegmentControl';

const OPTIONS = [
  { value: 'name' as GroupChipMode, label: 'Имя' },
  { value: 'name+status' as GroupChipMode, label: 'Имя+статус' },
];

export const GroupChipModeToggle = () => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const { mode, setMode } = useGroupChipMode();

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
        Группы
      </span>
      <SegmentControl
        theme={theme}
        variant="muted"
        options={OPTIONS}
        value={mode}
        onChange={setMode}
        ariaLabel="Режим отображения групп"
      />
    </div>
  );
};
