import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import {
  getLineItemTypeColor,
  getLineItemTypeLabel,
  type LineItemType,
} from 'src/constants/line-item-types';

import { getChipPalette, type ChipColor } from '../Chip';
import { useTheme } from '../theme/ThemeContext';
import type { LineItemRow, OpportunityRow } from '../types';
import {
  countDealsByPrefix,
  DEAL_PREFIX_LABELS,
  DEAL_PREFIX_ORDER,
} from '../utils/deal-prefix';
import {
  computeCategoryCardMetrics,
  computeProductionScoreboard,
  SCOREBOARD_TIP_ORDER,
  type CategoryCardMetrics,
} from './compute';

const SCOREBOARD_COLLAPSED_KEY = 'tv.dealsBoard.scoreboardCollapsed';

const TIP_ICON: Partial<Record<LineItemType, string>> = {
  BANNERA: '▣',
  PLENKA: '▭',
  PODRYAD: '◇',
  PROIZVODSTVO: '⬡',
  RESTAVRACIYA: '↻',
  NE_NASHE: '·',
};

type ProductionScoreboardProps = {
  lineItems: LineItemRow[];
  deals: OpportunityRow[];
  selectedTypes: LineItemType[];
  onToggleType: (tip: LineItemType) => void;
};

export const ProductionScoreboard = ({
  lineItems,
  deals,
  selectedTypes,
  onToggleType,
}: ProductionScoreboardProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius, colorScheme } = theme;
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return globalThis.localStorage?.getItem(SCOREBOARD_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      globalThis.localStorage?.setItem(SCOREBOARD_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  const stats = useMemo(() => computeProductionScoreboard(lineItems), [lineItems]);
  const cards = useMemo(() => computeCategoryCardMetrics(lineItems), [lineItems]);
  const prefixCounts = useMemo(() => countDealsByPrefix(deals), [deals]);

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
      background: active ? colors.bgTertiary : 'transparent',
      color: colors.text,
      borderRadius: radius.md,
      padding: '5px 8px',
      fontFamily: font.family,
      cursor: 'pointer',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 2,
      minWidth: 88,
      opacity: empty && !active ? 0.4 : 1,
      boxShadow: active ? `inset 0 0 0 1.5px ${palette.text}` : `inset 0 0 0 1px ${colors.borderSubtle}`,
      transition:
        'opacity 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), background-color 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), box-shadow 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
    };
  };

  return (
    <div
      data-production-scoreboard
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        margin: `${spacing.xs} ${spacing.md} 0`,
        padding: `2px 0`,
        minWidth: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          minWidth: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? 'Развернуть сводку' : 'Свернуть сводку'}
          aria-expanded={!collapsed}
          style={{
            border: 'none',
            background: 'transparent',
            color: colors.textSecondary,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '2px 4px',
            fontFamily: font.family,
            fontSize: font.sizeXs,
            fontWeight: font.weightSemibold,
          }}
        >
          <span aria-hidden style={{ fontSize: 12, lineHeight: 1 }}>
            {collapsed ? '⚑' : '⚐'}
          </span>
          Сводка
          <span style={{ color: colors.textMuted, fontWeight: font.weightMedium }}>
            {stats.totalPositions} поз · {stats.totalDeals} сд
          </span>
          <span style={{ color: colors.textMuted }}>{collapsed ? '›' : '˅'}</span>
        </button>
      </div>

      {collapsed ? null : (
        <>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'stretch',
              gap: 6,
              minWidth: 0,
            }}
          >
            {tipCards.map((tip) => {
              const metrics = cards[tip];
              const active = selectedTypes.includes(tip);
              const palette = getChipPalette(
                getLineItemTypeColor(tip) as ChipColor,
                colorScheme,
              );
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
                      fontWeight: font.weightSemibold,
                      color: palette.text,
                      letterSpacing: '-0.01em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <span aria-hidden style={{ opacity: 0.85 }}>
                      {TIP_ICON[tip] ?? '·'}
                    </span>
                    {getLineItemTypeLabel(tip)}
                  </span>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: font.weightBold,
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
                      fontSize: 10,
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

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '4px 10px',
              padding: `0 2px`,
              color: colors.textMuted,
              fontSize: font.sizeXs,
              fontVariantNumeric: 'tabular-nums',
              fontWeight: font.weightMedium,
            }}
            title="Сделки по префиксу названия (только счёт)"
          >
            {DEAL_PREFIX_ORDER.map((prefix) => {
              const count = prefixCounts[prefix];
              if (count <= 0) return null;
              return (
                <span key={prefix} style={{ whiteSpace: 'nowrap' }}>
                  <span style={{ color: colors.textSecondary }}>{DEAL_PREFIX_LABELS[prefix]}</span>{' '}
                  <span style={{ fontWeight: font.weightSemibold, color: colors.text }}>
                    {count}
                  </span>
                </span>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
