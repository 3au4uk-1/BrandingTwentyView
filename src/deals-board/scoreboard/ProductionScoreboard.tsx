import { useMemo, useState, type CSSProperties } from 'react';

import {
  getLineItemTypeColor,
  getLineItemTypeLabel,
  type LineItemType,
} from 'src/constants/line-item-types';
import {
  getStageColor,
  getStageLabel,
  type LineItemStage,
} from 'src/constants/stages';

import { getChipPalette, type ChipColor } from '../Chip';
import { useTheme } from '../theme/ThemeContext';
import type { LineItemRow } from '../types';
import {
  computeProductionScoreboard,
  computeTipStageBreakdown,
  SCOREBOARD_STAGE_ORDER,
  SCOREBOARD_TIP_ORDER,
  type MetricCount,
} from './compute';

type ProductionScoreboardProps = {
  lineItems: LineItemRow[];
  selectedTypes: LineItemType[];
  selectedStages: LineItemStage[];
  onToggleType: (tip: LineItemType) => void;
  onToggleStage: (stage: LineItemStage) => void;
};

const formatCount = (count: MetricCount): string =>
  `${count.positions} поз · ${count.deals} сд`;

const formatChipValue = (count: MetricCount): string =>
  count.deals > 0 || count.positions > 0
    ? `${count.positions}·${count.deals}`
    : '0';

export const ProductionScoreboard = ({
  lineItems,
  selectedTypes,
  selectedStages,
  onToggleType,
  onToggleStage,
}: ProductionScoreboardProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius, colorScheme } = theme;
  const [expandedTip, setExpandedTip] = useState<LineItemType | null>(null);

  const stats = useMemo(() => computeProductionScoreboard(lineItems), [lineItems]);
  const tipChips = useMemo(() => {
    const tips = [...SCOREBOARD_TIP_ORDER];
    if (stats.byTip.NE_NASHE.positions > 0) tips.push('NE_NASHE');
    return tips;
  }, [stats.byTip.NE_NASHE.positions]);

  const breakdown = useMemo(
    () => (expandedTip ? computeTipStageBreakdown(lineItems, expandedTip) : null),
    [expandedTip, lineItems],
  );

  const handleTipClick = (tip: LineItemType) => {
    onToggleType(tip);
    setExpandedTip((current) => (current === tip ? null : tip));
  };

  const metricChipStyle = (
    chipColor: ChipColor,
    active: boolean,
    empty: boolean,
  ): CSSProperties => {
    const palette = getChipPalette(chipColor, colorScheme);
    const quiet = empty && !active;

    return {
      border: `1px solid ${
        active ? palette.text : quiet ? colors.borderSubtle : `${palette.text}44`
      }`,
      borderLeft: `2px solid ${quiet ? colors.borderStrong : palette.text}`,
      background: active ? palette.bg : quiet ? 'transparent' : `${palette.bg}`,
      color: quiet ? colors.textMuted : palette.text,
      borderRadius: radius.sm,
      padding: '3px 7px 3px 6px',
      fontFamily: font.mono,
      fontSize: 11,
      lineHeight: 1.2,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'baseline',
      gap: 5,
      whiteSpace: 'nowrap',
      opacity: quiet ? 0.5 : 1,
      boxShadow: active ? `0 0 0 1px ${palette.text}33` : undefined,
      transition: 'opacity 0.15s ease, border-color 0.15s ease, background-color 0.15s ease',
    };
  };

  const chipWrap: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    flex: 1,
    minWidth: 0,
  };

  return (
    <div
      data-production-scoreboard
      title="Клик по типу — фильтр и разбивка по стадиям"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        margin: `${spacing.sm} ${spacing.md} 0`,
        padding: `${spacing.sm} ${spacing.md}`,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        background: `linear-gradient(180deg, ${colors.bgElevated} 0%, ${colors.bgSecondary} 100%)`,
        boxShadow: colors.shadow,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px 10px',
          minWidth: 0,
        }}
      >
        <span
          style={{
            fontFamily: font.mono,
            fontSize: 9,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: colors.textMuted,
            flexShrink: 0,
          }}
        >
          Сводка
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: 5,
            flexShrink: 0,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: font.weightBold,
              color: colors.text,
              letterSpacing: '-0.03em',
              lineHeight: 1,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {stats.totalPositions}
          </span>
          <span style={{ fontSize: font.sizeXs, color: colors.textSecondary }}>поз</span>
          <span
            style={{
              fontSize: font.sizeXs,
              color: colors.textMuted,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            · {stats.totalDeals} сд
          </span>
        </span>

        <div style={chipWrap}>
          {tipChips.map((tip) => {
            const count = stats.byTip[tip];
            const active = selectedTypes.includes(tip) || expandedTip === tip;
            const empty = count.positions === 0;
            const chipColor = getLineItemTypeColor(tip) as ChipColor;
            return (
              <button
                key={tip}
                type="button"
                style={metricChipStyle(chipColor, active, empty)}
                onClick={() => handleTipClick(tip)}
                title={`${getLineItemTypeLabel(tip)}: ${formatCount(count)}`}
              >
                <span style={{ fontWeight: font.weightSemibold }}>{getLineItemTypeLabel(tip)}</span>
                <span
                  style={{
                    fontWeight: font.weightBold,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatChipValue(count)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {expandedTip && breakdown ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 4,
            paddingLeft: 2,
          }}
        >
          <span
            style={{
              fontFamily: font.mono,
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: colors.textMuted,
              marginRight: 4,
            }}
          >
            {getLineItemTypeLabel(expandedTip)} →
          </span>
          {SCOREBOARD_STAGE_ORDER.map((stage) => {
            const count = breakdown[stage];
            const active = selectedStages.includes(stage);
            const empty = count.positions === 0;
            const chipColor = getStageColor(stage) as ChipColor;
            return (
              <button
                key={`${expandedTip}-${stage}`}
                type="button"
                style={metricChipStyle(chipColor, active, empty)}
                onClick={() => onToggleStage(stage)}
                title={`${getLineItemTypeLabel(expandedTip)} / ${getStageLabel(stage)}: ${formatCount(count)}`}
              >
                <span style={{ fontWeight: font.weightSemibold }}>{getStageLabel(stage)}</span>
                <span
                  style={{
                    fontWeight: font.weightBold,
                    fontVariantNumeric: 'tabular-nums',
                    letterSpacing: '-0.02em',
                  }}
                >
                  {formatChipValue(count)}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};
