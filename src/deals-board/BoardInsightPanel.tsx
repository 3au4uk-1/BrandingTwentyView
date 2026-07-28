import { useEffect, useMemo, useState } from 'react';

import {
  getLineItemTypeColor,
  getLineItemTypeLabel,
  type LineItemType,
} from 'src/constants/line-item-types';

import { ATTENTION_TIP_ORDER, type AttentionStats } from './attention/compute';
import { getChipPalette, type ChipColor } from './Chip';
import {
  computeCategoryCardMetrics,
  computeProductionScoreboard,
  SCOREBOARD_TIP_ORDER,
} from './scoreboard/compute';
import { useTheme } from './theme/ThemeContext';
import type { LineItemRow, OpportunityRow } from './types';

const SCOREBOARD_COLLAPSED_KEY = 'tv.dealsBoard.scoreboardCollapsed';

const TIP_ICON: Partial<Record<LineItemType, string>> = {
  BANNERA: '▣',
  PLENKA: '▭',
  PODRYAD: '◇',
  PROIZVODSTVO: '⬡',
  RESTAVRACIYA: '↻',
  NE_NASHE: '·',
};

const STAGE_DOT = {
  print: '#ffd60a',
  work: '#bf5af2',
  ready: '#30d158',
} as const;

type BoardInsightPanelProps = {
  lineItems: LineItemRow[];
  deals: OpportunityRow[];
  selectedTypes: LineItemType[];
  onToggleType: (tip: LineItemType) => void;
  attentionStats: AttentionStats;
  attentionTip: LineItemType | null;
  onToggleAttentionTip: (tip: LineItemType) => void;
  summaryTitle?: string;
};

export const BoardInsightPanel = ({
  lineItems,
  selectedTypes,
  onToggleType,
  attentionStats,
  attentionTip,
  onToggleAttentionTip,
  summaryTitle = 'Сводка',
}: BoardInsightPanelProps) => {
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

  const tipCards = useMemo(() => {
    const tips = [...SCOREBOARD_TIP_ORDER];
    if (cards.NE_NASHE.total > 0) tips.push('NE_NASHE');
    return tips;
  }, [cards.NE_NASHE.total]);

  const hasAttention = attentionStats.total > 0;

  return (
    <section
      data-board-insight-panel
      style={{
        margin: `${spacing.sm} ${spacing.md} 0`,
        minWidth: 0,
        borderRadius: radius.lg,
        backgroundColor: colors.bgSecondary,
        boxShadow: `inset 0 0 0 1px ${colors.borderSubtle}`,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 6,
          padding: `6px ${spacing.md}`,
          minHeight: 36,
          minWidth: 0,
        }}
      >
        {hasAttention ? (
          <>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: font.sizeXs,
                fontWeight: font.weightSemibold,
                color: colors.text,
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              <span aria-hidden style={{ color: colors.warning }}>
                ⚠
              </span>
              Требует внимания
              <span
                style={{
                  minWidth: 18,
                  height: 18,
                  padding: '0 5px',
                  borderRadius: radius.pill,
                  backgroundColor: colors.warningMuted,
                  color: colors.warning,
                  fontSize: 10,
                  fontWeight: font.weightSemibold,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {attentionStats.total}
              </span>
            </span>
            {ATTENTION_TIP_ORDER.map((tip) => {
              const count = attentionStats.byTip[tip] ?? 0;
              const active = attentionTip === tip;
              const palette = getChipPalette(getLineItemTypeColor(tip) as ChipColor, colorScheme);
              const empty = count === 0;
              return (
                <button
                  key={tip}
                  type="button"
                  onClick={() => onToggleAttentionTip(tip)}
                  disabled={empty}
                  title={`${getLineItemTypeLabel(tip)}: ${count}`}
                  style={{
                    border: 'none',
                    cursor: empty ? 'default' : 'pointer',
                    borderRadius: radius.pill,
                    padding: '3px 8px',
                    fontFamily: font.family,
                    fontSize: 10,
                    fontWeight: font.weightMedium,
                    backgroundColor: active ? colors.bgElevated : 'transparent',
                    color: empty ? colors.textMuted : colors.textSecondary,
                    opacity: empty ? 0.4 : 1,
                    boxShadow: active ? `inset 0 0 0 1px ${colors.border}` : undefined,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span
                    aria-hidden
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      backgroundColor: palette.text,
                      flexShrink: 0,
                    }}
                  />
                  {getLineItemTypeLabel(tip)} {count}
                </button>
              );
            })}
            <span
              aria-hidden
              style={{
                width: 1,
                height: 16,
                backgroundColor: colors.borderSubtle,
                margin: '0 2px',
                flexShrink: 0,
              }}
            />
          </>
        ) : null}

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 8,
            minWidth: 0,
            fontSize: font.sizeXs,
            fontWeight: font.weightMedium,
            color: colors.textMuted,
            fontVariantNumeric: 'tabular-nums',
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ fontWeight: font.weightSemibold, color: colors.textSecondary }}>
            {summaryTitle}
          </span>
          {stats.totalPositions} поз · {stats.totalDeals} сд
        </span>

        <button
          type="button"
          onClick={() => setCollapsed((value) => !value)}
          title={collapsed ? 'Развернуть сводку' : 'Свернуть сводку'}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Развернуть сводку' : 'Свернуть сводку'}
          style={{
            marginLeft: 'auto',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: radius.sm,
            color: colors.textMuted,
            fontFamily: font.family,
            fontSize: font.sizeSm,
            lineHeight: 1,
            flexShrink: 0,
          }}
        >
          {collapsed ? '▸' : '▾'}
        </button>
      </div>

      {collapsed ? null : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))',
            gap: 6,
            padding: `0 ${spacing.md} 8px`,
            minWidth: 0,
            borderTop: `1px solid ${colors.borderSubtle}`,
            paddingTop: 8,
          }}
        >
          {tipCards.map((tip) => {
            const metrics = cards[tip];
            const active = selectedTypes.includes(tip);
            const palette = getChipPalette(getLineItemTypeColor(tip) as ChipColor, colorScheme);
            const empty = metrics.total === 0;
            return (
              <button
                key={tip}
                type="button"
                onClick={() => onToggleType(tip)}
                title={`${getLineItemTypeLabel(tip)}: ${metrics.total}`}
                style={{
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: radius.md,
                  padding: '8px 10px',
                  fontFamily: font.family,
                  backgroundColor: colors.bgElevated,
                  opacity: empty && !active ? 0.45 : 1,
                  boxShadow: active
                    ? `inset 0 0 0 1.5px ${colors.accent}`
                    : `inset 0 0 0 1px ${colors.borderSubtle}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'stretch',
                  gap: 4,
                  textAlign: 'left',
                  minWidth: 0,
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      fontSize: font.sizeXs,
                      fontWeight: font.weightMedium,
                      color: colors.textSecondary,
                      minWidth: 0,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span aria-hidden style={{ color: palette.text, opacity: 0.9 }}>
                      {TIP_ICON[tip] ?? '·'}
                    </span>
                    {getLineItemTypeLabel(tip)}
                  </span>
                  <span
                    style={{
                      fontSize: font.sizeMd,
                      fontWeight: font.weightSemibold,
                      letterSpacing: '-0.03em',
                      lineHeight: 1,
                      fontVariantNumeric: 'tabular-nums',
                      color: colors.text,
                      flexShrink: 0,
                    }}
                  >
                    {metrics.total}
                  </span>
                </span>
                <span
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '2px 8px',
                    fontSize: 10,
                    fontWeight: font.weightMedium,
                    color: colors.textMuted,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  <StageCount color={STAGE_DOT.print} label="Печать" value={metrics.inPrint} />
                  <StageCount color={STAGE_DOT.work} label="Работа" value={metrics.inWork} />
                  <StageCount color={STAGE_DOT.ready} label="Готово" value={metrics.ready} />
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
};

const StageCount = ({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}>
    <span
      aria-hidden
      style={{
        width: 5,
        height: 5,
        borderRadius: '50%',
        backgroundColor: color,
      }}
    />
    {label} {value}
  </span>
);
