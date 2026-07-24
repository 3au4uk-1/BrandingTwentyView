import { useMemo } from 'react';

import { useTheme } from '../theme/ThemeContext';
import type { LineItemRow, OpportunityRow } from '../types';
import {
  computeMonthlyFinance,
  formatRub,
  getMonthKey,
} from './compute';

type MarginStripProps = {
  opportunities: OpportunityRow[];
  lineItems: LineItemRow[];
  onOpenAnalytics: () => void;
};

const formatShortMonth = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  const label = new Date(year, month - 1, 1).toLocaleDateString('ru-RU', {
    month: 'short',
    year: '2-digit',
  });
  return label.replace(/\s*г\.?$/, '').trim();
};

export const MarginStrip = ({
  opportunities,
  lineItems,
  onOpenAnalytics,
}: MarginStripProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const monthKey = getMonthKey();
  const finance = useMemo(
    () => computeMonthlyFinance(opportunities, lineItems, monthKey),
    [opportunities, lineItems, monthKey],
  );

  const marginColor =
    finance.marginRub > 0
      ? colors.success
      : finance.marginRub < 0
        ? colors.danger
        : colors.textMuted;

  const marginBg =
    finance.marginRub > 0
      ? colors.successMuted
      : finance.marginRub < 0
        ? colors.dangerMuted
        : colors.bgInset;

  const title = [
    formatShortMonth(monthKey),
    `${finance.dealCount} сд`,
    `${finance.positionCount} поз`,
  ].join(' · ');

  return (
    <button
      type="button"
      data-margin-strip
      onClick={onOpenAnalytics}
      title={`Финансы месяца · оборот ${formatRub(finance.turnoverRub)} · расход ${formatRub(finance.expenseRub)} · маржа ${formatRub(finance.marginRub)}${finance.marginPct !== null ? ` (${finance.marginPct.toFixed(0)}%)` : ''} · открыть аналитику`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: '100%',
        height: 30,
        padding: `0 ${spacing.sm} 0 8px`,
        margin: 0,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.pill,
        background: `linear-gradient(180deg, ${colors.bgElevated} 0%, ${colors.bgSecondary} 100%)`,
        boxShadow: colors.shadow,
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: colors.text,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
    >
      <span
        style={{
          fontFamily: font.mono,
          fontSize: 9,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: colors.textMuted,
          flexShrink: 0,
        }}
      >
        {title}
      </span>

      <span
        aria-hidden
        style={{ width: 1, height: 14, background: colors.borderSubtle, flexShrink: 0 }}
      />

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 6,
          fontSize: 11,
          fontVariantNumeric: 'tabular-nums',
          minWidth: 0,
          overflow: 'hidden',
        }}
      >
        <span style={{ color: colors.textMuted }}>Обр</span>
        <span style={{ fontWeight: font.weightSemibold }}>{formatRub(finance.turnoverRub)}</span>
        <span style={{ color: colors.textMuted }}>Расх</span>
        <span style={{ fontWeight: font.weightSemibold }}>{formatRub(finance.expenseRub)}</span>
      </span>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 4,
          height: 22,
          padding: '0 7px',
          borderRadius: radius.pill,
          background: marginBg,
          border: `1px solid ${marginColor}44`,
          color: marginColor,
          fontSize: 11,
          fontWeight: font.weightBold,
          fontVariantNumeric: 'tabular-nums',
          flexShrink: 0,
        }}
      >
        <span style={{ fontWeight: font.weightSemibold, opacity: 0.85 }}>Маржа</span>
        {formatRub(finance.marginRub)}
        {finance.marginPct !== null ? (
          <span style={{ fontWeight: font.weightMedium, opacity: 0.8 }}>
            {finance.marginPct.toFixed(0)}%
          </span>
        ) : null}
      </span>

      <span
        style={{
          fontFamily: font.mono,
          fontSize: 10,
          letterSpacing: '0.04em',
          color: colors.accentText,
          flexShrink: 0,
        }}
      >
        →
      </span>
    </button>
  );
};
