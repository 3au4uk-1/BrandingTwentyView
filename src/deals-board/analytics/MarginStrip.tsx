import { useMemo, type CSSProperties } from 'react';

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

type MetricTone = 'neutral' | 'positive' | 'negative' | 'muted';

const MetricCell = ({
  label,
  value,
  hint,
  tone,
  emphasize,
  style,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: MetricTone;
  emphasize?: boolean;
  style?: CSSProperties;
}) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;

  const valueColor =
    tone === 'positive'
      ? colors.success
      : tone === 'negative'
        ? colors.danger
        : tone === 'muted'
          ? colors.textMuted
          : colors.text;

  const cellBg =
    tone === 'positive'
      ? colors.successMuted
      : tone === 'negative'
        ? colors.dangerMuted
        : emphasize
          ? colors.bgInset
          : 'transparent';

  return (
    <div
      style={{
        minWidth: emphasize ? 148 : 112,
        padding: `${spacing.sm} ${spacing.md}`,
        borderRadius: radius.md,
        background: cellBg,
        border:
          tone === 'positive' || tone === 'negative' || emphasize
            ? `1px solid ${
                tone === 'positive'
                  ? `${colors.success}44`
                  : tone === 'negative'
                    ? `${colors.danger}44`
                    : colors.borderSubtle
              }`
            : '1px solid transparent',
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: font.mono,
          fontSize: 10,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: colors.textMuted,
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: emphasize ? 20 : 16,
          fontWeight: font.weightBold,
          color: valueColor,
          letterSpacing: '-0.03em',
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      {hint ? (
        <div
          style={{
            marginTop: 3,
            fontSize: font.sizeXs,
            color: colors.textMuted,
            fontVariantNumeric: 'tabular-nums',
          }}
        >
          {hint}
        </div>
      ) : null}
    </div>
  );
};

const Divider = () => {
  const { colors } = useTheme();
  return (
    <div
      aria-hidden
      style={{
        width: 1,
        alignSelf: 'stretch',
        minHeight: 36,
        background: colors.borderSubtle,
        flexShrink: 0,
      }}
    />
  );
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

  const marginTone: MetricTone =
    finance.marginRub > 0 ? 'positive' : finance.marginRub < 0 ? 'negative' : 'muted';

  const monthTitle =
    finance.monthLabel.charAt(0).toUpperCase() + finance.monthLabel.slice(1);

  return (
    <div
      data-margin-strip
      style={{
        margin: `${spacing.sm} ${spacing.md} 0`,
        padding: `${spacing.sm} ${spacing.md}`,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.lg,
        background: `linear-gradient(180deg, ${colors.bgElevated} 0%, ${colors.bgSecondary} 100%)`,
        boxShadow: colors.shadow,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.sm,
      }}
    >
      <div style={{ minWidth: 120, paddingRight: spacing.sm }}>
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
          Финансы месяца
        </div>
        <div
          style={{
            fontSize: font.sizeMd,
            fontWeight: font.weightSemibold,
            color: colors.text,
            letterSpacing: '-0.02em',
          }}
        >
          {monthTitle}
        </div>
        <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginTop: 2 }}>
          {finance.dealCount} сд · {finance.positionCount} поз
        </div>
      </div>

      <Divider />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'stretch',
          gap: spacing.xs,
          flex: 1,
          minWidth: 0,
        }}
      >
        <MetricCell label="Оборот" value={formatRub(finance.turnoverRub)} tone="neutral" />
        <MetricCell label="Расход" value={formatRub(finance.expenseRub)} tone="neutral" />
        <MetricCell
          label="Маржа"
          value={formatRub(finance.marginRub)}
          hint={finance.marginPct !== null ? `${finance.marginPct.toFixed(0)}% от оборота` : undefined}
          tone={marginTone}
          emphasize
        />
      </div>

      <button
        type="button"
        onClick={onOpenAnalytics}
        style={{
          height: 34,
          padding: `0 ${spacing.md}`,
          borderRadius: radius.pill,
          border: `1px solid ${colors.borderStrong}`,
          background: colors.bgInset,
          color: colors.accentText,
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: font.sizeXs,
          fontWeight: font.weightSemibold,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Аналитика →
      </button>
    </div>
  );
};
