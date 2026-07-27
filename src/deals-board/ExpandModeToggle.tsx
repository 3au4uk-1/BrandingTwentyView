import { useExpandMode } from './hooks/useExpandMode';
import { useTheme } from './theme/ThemeContext';

/** Per-user (localStorage) smart expand toggle. */
export const ExpandModeToggle = () => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const { mode, setMode } = useExpandMode();
  const smart = mode === 'smart';

  return (
    <label
      title={
        smart
          ? 'Умное: раскрыты сделки не в «Готово» / «Отмена» (только у вас)'
          : 'Все сделки свёрнуты по умолчанию (только у вас)'
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: spacing.xs,
        flexShrink: 0,
        cursor: 'pointer',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          fontSize: font.sizeXs,
          fontWeight: font.weightMedium,
          color: smart ? colors.text : colors.textMuted,
          whiteSpace: 'nowrap',
        }}
      >
        Умное
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={smart}
        aria-label="Умное раскрытие"
        onClick={() => setMode(smart ? 'collapsed' : 'smart')}
        style={{
          width: 36,
          height: 22,
          padding: 2,
          border: 'none',
          borderRadius: radius.pill,
          backgroundColor: smart ? colors.accent : colors.bgTertiary,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: smart ? 'flex-end' : 'flex-start',
          transition: 'background-color 0.15s ease',
        }}
      >
        <span
          aria-hidden
          style={{
            width: 18,
            height: 18,
            borderRadius: '50%',
            backgroundColor: colors.textInverse,
            boxShadow: colors.shadow,
          }}
        />
      </button>
    </label>
  );
};
