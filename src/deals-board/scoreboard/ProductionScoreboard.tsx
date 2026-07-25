import { useMemo, type CSSProperties } from 'react';

import {
  getLineItemTypeColor,
  getLineItemTypeLabel,
  type LineItemType,
} from 'src/constants/line-item-types';

import { getChipPalette, type ChipColor } from '../Chip';
import { useTheme } from '../theme/ThemeContext';
import type { LineItemRow } from '../types';
import {
  computeCategoryCardMetrics,
  computeProductionScoreboard,
  SCOREBOARD_TIP_ORDER,
  type CategoryCardMetrics,
} from './compute';

type ProductionScoreboardProps = {
  lineItems: LineItemRow[];
  selectedTypes: LineItemType[];
  onToggleType: (tip: LineItemType) => void;
};

export const ProductionScoreboard = ({
  lineItems,
  selectedTypes,
  onToggleType,
}: ProductionScoreboardProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius, colorScheme } = theme;

  const stats = useMemo(() => computeProductionScoreboard(lineItems), [lineItems]);
  const cards = useMemo(() => computeCategoryCardMetrics(lineItems), [lineItems]);

  const tipCards = useMemo(() => {
    const tips = [...SCOREBOARD_TIP_ORDER];
    if (cards.NE_NASHE.total > 0) tips.push('NE_NASHE');
    return tips;
  }, [cards.NE_NASHE.total]);

  const cardStyle = (
    tip: LineItemType,
    metrics: CategoryCardMetrics,
    active: boolean,
  ): CSSProperties => {
    const palette = getChipPalette(getLineItemTypeColor(tip) as ChipColor, colorScheme);
    const empty = metrics.total === 0;

    return {
      border: 'none',
      background: active ? palette.bg : empty ? 'transparent' : colors.bgElevated,
      color: colors.text,
      borderRadius: radius.md,
      padding: '8px 10px',
      fontFamily: font.family,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 4,
      minWidth: 108,
      opacity: empty && !active ? 0.4 : 1,
      boxShadow: active ? `inset 0 0 0 1.5px ${palette.text}` : undefined,
      transition:
        'opacity 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), box-shadow 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
    };
  };

  return (
    <div
      data-production-scoreboard
      title="Клик по категории — фильтр по типу"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'stretch',
        gap: 8,
        margin: `${spacing.sm} ${spacing.md} 0`,
        padding: `4px 0`,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 2,
          flexShrink: 0,
          padding: '4px 2px',
          minWidth: 72,
        }}
      >
        <span
          style={{
            fontSize: font.sizeXs,
            fontWeight: font.weightMedium,
            color: colors.textMuted,
            letterSpacing: '-0.01em',
          }}
        >
          Сводка
        </span>
        <span
          style={{
            fontSize: 17,
            fontWeight: font.weightSemibold,
            color: colors.text,
            letterSpacing: '-0.03em',
            lineHeight: 1,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {stats.totalPositions}
          <span
            style={{
              fontSize: font.sizeXs,
              fontWeight: font.weightMedium,
              color: colors.textSecondary,
              marginLeft: 4,
            }}
          >
            поз
          </span>
        </span>
        <span
          style={{
            fontSize: font.sizeXs,
            color: colors.textMuted,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {stats.totalDeals} сд
        </span>
      </div>

      {tipCards.map((tip) => {
        const metrics = cards[tip];
        const active = selectedTypes.includes(tip);
        return (
          <button
            key={tip}
            type="button"
            style={cardStyle(tip, metrics, active)}
            onClick={() => onToggleType(tip)}
            title={`${getLineItemTypeLabel(tip)}: ${metrics.total} поз · печать ${metrics.inPrint} · работа ${metrics.inWork} · готово ${metrics.ready}`}
          >
            <span
              style={{
                fontSize: font.sizeXs,
                fontWeight: font.weightMedium,
                color: colors.textSecondary,
                letterSpacing: '-0.01em',
              }}
            >
              {getLineItemTypeLabel(tip)}
            </span>
            <span
              style={{
                fontSize: 20,
                fontWeight: font.weightSemibold,
                letterSpacing: '-0.03em',
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums',
                color: colors.text,
              }}
            >
              {metrics.total}
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: font.weightMedium,
                color: colors.textMuted,
                fontVariantNumeric: 'tabular-nums',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              печать {metrics.inPrint}
              <span style={{ opacity: 0.45 }}> · </span>
              работа {metrics.inWork}
              <span style={{ opacity: 0.45 }}> · </span>
              готово {metrics.ready}
            </span>
          </button>
        );
      })}
    </div>
  );
};
