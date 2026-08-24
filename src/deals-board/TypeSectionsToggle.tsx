import { useTypeSections } from './hooks/useTypeSections';
import { useTheme } from './theme/ThemeContext';

/** Per-user (localStorage) type-section grouping toggle. */
export const TypeSectionsToggle = () => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const { enabled, setEnabled } = useTypeSections();

  return (
    <label
      title={
        enabled
          ? 'Позиции внутри сделки сгруппированы по типу (только у вас)'
          : 'Позиции в порядке поля «порядок» (только у вас)'
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
          color: enabled ? colors.text : colors.textMuted,
          whiteSpace: 'nowrap',
        }}
      >
        По типам
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label="По типам"
        onClick={() => setEnabled(!enabled)}
        style={{
          width: 36,
          height: 22,
          padding: 2,
          border: 'none',
          borderRadius: radius.pill,
          backgroundColor: enabled ? colors.accent : colors.bgTertiary,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: enabled ? 'flex-end' : 'flex-start',
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
