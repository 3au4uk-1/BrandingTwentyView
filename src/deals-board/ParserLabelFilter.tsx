import { BOARD_STREAM, type BoardStream } from 'src/constants/product-stream';

import { getChipPalette } from './Chip';
import { isCrmparserConfigured } from './api/crmparser';
import { useParserLabelFilter } from './hooks/useParserLabelFilter';
import { useTheme } from './theme/ThemeContext';
import { parserLabelsForBoard } from './utils/parser-label-filter';

type ParserLabelFilterProps = {
  boardStream?: BoardStream;
};

/** Per-user toggles for parser chips. Turning a label off hides positions that carry it. */
export const ParserLabelFilter = ({ boardStream = BOARD_STREAM.BRANDING }: ParserLabelFilterProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const { isShown, toggle } = useParserLabelFilter();
  const labels = parserLabelsForBoard(boardStream);

  if (!isCrmparserConfigured() || labels.length === 0) return null;

  return (
    <div
      role="group"
      aria-label="Ярлыки парсера"
      title="Отключённый ярлык скрывает позиции с ним. Позиции без ярлыка остаются."
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
        Ярлыки
      </span>
      {labels.map((label) => {
        const shown = isShown(label.id);
        const palette = getChipPalette(label.color, theme.colorScheme);

        return (
          <button
            key={label.id}
            type="button"
            aria-pressed={shown}
            title={
              shown
                ? `Скрыть позиции с ярлыком «${label.label}»`
                : `Показать позиции с ярлыком «${label.label}»`
            }
            onClick={() => toggle(label.id)}
            style={{
              border: 'none',
              borderRadius: radius.pill,
              padding: '2px 8px',
              fontSize: font.sizeXs,
              fontFamily: font.family,
              fontWeight: font.weightMedium,
              letterSpacing: '-0.01em',
              lineHeight: 1.35,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              backgroundColor: shown ? palette.bg : colors.bgTertiary,
              color: shown ? palette.text : colors.textMuted,
              textDecoration: shown ? 'none' : 'line-through',
              opacity: shown ? 1 : 0.72,
            }}
          >
            {label.label}
          </button>
        );
      })}
    </div>
  );
};
