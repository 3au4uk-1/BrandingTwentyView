import { useMemo, type CSSProperties } from 'react';

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

export const ProductionScoreboard = ({
  lineItems,
  selectedTypes,
  selectedStages,
  onToggleType,
  onToggleStage,
}: ProductionScoreboardProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius, colorScheme } = theme;

  const stats = useMemo(() => computeProductionScoreboard(lineItems), [lineItems]);

  const metricChipStyle = (
    chipColor: ChipColor,
    active: boolean,
    empty: boolean,
  ): CSSProperties => {
    const palette = getChipPalette(chipColor, colorScheme);
    const quiet = empty && !active;

    return {
      border: `1px solid ${
        active ? palette.text : quiet ? colors.borderSubtle : `${palette.text}55`
      }`,
      borderLeft: `3px solid ${quiet ? colors.borderStrong : palette.text}`,
      background: active
        ? palette.bg
        : quiet
          ? colors.bgInset
          : palette.bg,
      color: quiet ? colors.textMuted : palette.text,
      borderRadius: radius.md,
      padding: '7px 11px 6px 9px',
      fontFamily: font.mono,
      fontSize: 11,
      cursor: 'pointer',
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: 2,
      minWidth: 92,
      opacity: quiet ? 0.55 : 1,
      boxShadow: active ? `0 0 0 1px ${palette.text}33` : undefined,
      transition: 'opacity 0.15s ease, border-color 0.15s ease, background-color 0.15s ease',
    };
  };

  const groupLabel: CSSProperties = {
    fontFamily: font.mono,
    fontSize: 10,
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    color: colors.textMuted,
    width: 52,
    flexShrink: 0,
  };

  return (
    <div
      data-production-scoreboard
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
        margin: `${spacing.sm} ${spacing.md} 0`,
        padding: `${spacing.md} ${spacing.md}`,
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
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: font.mono,
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: colors.textMuted,
              marginBottom: 2,
            }}
          >
            Сводка смены
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing.sm }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: font.weightBold,
                color: colors.text,
                letterSpacing: '-0.04em',
                lineHeight: 1,
              }}
            >
              {stats.totalPositions}
            </span>
            <span style={{ fontSize: font.sizeSm, color: colors.textSecondary }}>поз</span>
            <span style={{ fontSize: font.sizeXs, color: colors.textMuted }}>
              · {stats.totalDeals} сделок в фильтре
            </span>
          </div>
        </div>
        <div style={{ fontSize: font.sizeXs, color: colors.textMuted, fontFamily: font.mono }}>
          клик — фильтр
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span style={groupLabel}>Тип</span>
        {SCOREBOARD_TIP_ORDER.map((tip) => {
          const count = stats.byTip[tip];
          const active = selectedTypes.includes(tip);
          const empty = count.positions === 0;
          const chipColor = getLineItemTypeColor(tip) as ChipColor;
          return (
            <button
              key={tip}
              type="button"
              style={metricChipStyle(chipColor, active, empty)}
              onClick={() => onToggleType(tip)}
              title={`${getLineItemTypeLabel(tip)}: ${formatCount(count)}`}
            >
              <span style={{ fontWeight: font.weightSemibold, fontSize: 12, lineHeight: 1.2 }}>
                {getLineItemTypeLabel(tip)}{' '}
                <span style={{ fontWeight: font.weightBold }}>{count.positions}</span>
              </span>
              <span style={{ fontSize: 10, opacity: 0.8 }}>{count.deals} сд</span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          height: 1,
          background: colors.borderSubtle,
          margin: `2px 0`,
        }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
        <span style={groupLabel}>Стадия</span>
        {SCOREBOARD_STAGE_ORDER.map((stage) => {
          const count = stats.byStage[stage];
          const active = selectedStages.includes(stage);
          const empty = count.positions === 0;
          const chipColor = getStageColor(stage) as ChipColor;
          return (
            <button
              key={stage}
              type="button"
              style={metricChipStyle(chipColor, active, empty)}
              onClick={() => onToggleStage(stage)}
              title={`${getStageLabel(stage)}: ${formatCount(count)}`}
            >
              <span style={{ fontWeight: font.weightSemibold, fontSize: 12, lineHeight: 1.2 }}>
                {getStageLabel(stage)}{' '}
                <span style={{ fontWeight: font.weightBold }}>{count.positions}</span>
              </span>
              <span style={{ fontSize: 10, opacity: 0.8 }}>{count.deals} сд</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
