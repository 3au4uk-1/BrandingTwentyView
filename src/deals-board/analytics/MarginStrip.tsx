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
  isExpenseLoading?: boolean;
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
  isExpenseLoading = false,
}: MarginStripProps) => {
  const theme = useTheme();
  const { colors, font, radius } = theme;
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
        : colors.bgTertiary;

  return (
    <button
      type="button"
      data-margin-strip
      onClick={onOpenAnalytics}
      title={`Финансы · ${formatShortMonth(monthKey)} · оборот ${formatRub(finance.turnoverRub)} · расход ${formatRub(finance.expenseRub)} · маржа ${formatRub(finance.marginRub)}${finance.marginPct !== null ? ` (${finance.marginPct.toFixed(0)}%)` : ''} · ${finance.dealCount} сд · ${finance.positionCount} поз`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        maxWidth: '100%',
        height: 30,
        padding: `0 6px 0 10px`,
        margin: 0,
        border: 'none',
        borderRadius: radius.pill,
        background: colors.bgTertiary,
        cursor: 'pointer',
        fontFamily: font.family,
        color: colors.text,
        opacity: isExpenseLoading ? 0.55 : 1,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        transition:
          'background-color 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), opacity 0.2s cubic-bezier(0.25, 0.1, 0.25, 1), transform 0.15s cubic-bezier(0.25, 0.1, 0.25, 1)',
      }}
    >
      <span
        style={{
          fontSize: font.sizeXs,
          fontWeight: font.weightMedium,
          color: colors.textMuted,
          letterSpacing: '-0.01em',
          flexShrink: 0,
        }}
      >
        {formatShortMonth(monthKey)}
      </span>

      <span
        style={{
          display: 'inline-flex',
          alignItems: 'baseline',
          gap: 5,
          height: 22,
          padding: '0 8px',
          borderRadius: radius.pill,
          background: marginBg,
          color: marginColor,
          fontSize: font.sizeXs,
          fontWeight: font.weightSemibold,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '-0.015em',
          flexShrink: 0,
        }}
      >
        {formatRub(finance.marginRub)}
        {finance.marginPct !== null ? (
          <span style={{ fontWeight: font.weightMedium, opacity: 0.72 }}>
            {finance.marginPct.toFixed(0)}%
          </span>
        ) : null}
      </span>

      <span
        aria-hidden
        style={{
          width: 22,
          height: 22,
          borderRadius: radius.pill,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: colors.bgElevated,
          color: colors.accentText,
          fontSize: 13,
          fontWeight: font.weightMedium,
          flexShrink: 0,
        }}
      >
        ›
      </span>
    </button>
  );
};
