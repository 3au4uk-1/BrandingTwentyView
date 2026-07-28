import { useMemo, useState } from 'react';

import { useTheme } from '../theme/ThemeContext';
import type { LineItemRow, OpportunityRow } from '../types';
import { Button } from '../ui/Button';
import {
  computeMonthlyFinance,
  formatRub,
  getMonthKey,
  shiftMonthKey,
} from './compute';

type AnalyticsPanelProps = {
  opportunities: OpportunityRow[];
  lineItems: LineItemRow[];
  onBack: () => void;
};

const BREAKDOWN_ROWS: { key: keyof ReturnType<typeof computeMonthlyFinance>['breakdown']; label: string }[] = [
  { key: 'pechat', label: 'Печать' },
  { key: 'frezerovka', label: 'Фрезеровка' },
  { key: 'logistika', label: 'Логистика' },
  { key: 'vyezdnayaKomanda', label: 'Выездная команда' },
  { key: 'beznal', label: 'Безнал' },
];

export const AnalyticsPanel = ({
  opportunities,
  lineItems,
  onBack,
}: AnalyticsPanelProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const [monthKey, setMonthKey] = useState(() => getMonthKey());

  const finance = useMemo(
    () => computeMonthlyFinance(opportunities, lineItems, monthKey),
    [opportunities, lineItems, monthKey],
  );

  const marginColor =
    finance.marginRub > 0
      ? colors.success
      : finance.marginRub < 0
        ? colors.danger
        : colors.textSecondary;

  return (
    <div
      data-analytics-panel
      style={{
        padding: spacing.md,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
        minHeight: 0,
        overflow: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
        <Button theme={theme} size="sm" variant="ghost" onClick={onBack}>
          ← Реализация
        </Button>
        <div style={{ flex: 1 }} />
        <Button
          theme={theme}
          size="sm"
          variant="ghost"
          onClick={() => setMonthKey((current) => shiftMonthKey(current, -1))}
        >
          ←
        </Button>
        <span style={{ fontSize: font.sizeMd, fontWeight: font.weightSemibold, minWidth: 140, textAlign: 'center' }}>
          {finance.monthLabel}
        </span>
        <Button
          theme={theme}
          size="sm"
          variant="ghost"
          onClick={() => setMonthKey((current) => shiftMonthKey(current, 1))}
        >
          →
        </Button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: spacing.sm,
        }}
      >
        {[
          { label: 'Оборот', value: formatRub(finance.turnoverRub), color: colors.text },
          { label: 'Расход', value: formatRub(finance.expenseRub), color: colors.text },
          {
            label: 'Маржа',
            value: `${formatRub(finance.marginRub)}${
              finance.marginPct !== null ? ` · ${finance.marginPct.toFixed(0)}%` : ''
            }`,
            color: marginColor,
          },
        ].map((card) => (
          <div
            key={card.label}
            style={{
              padding: spacing.md,
              borderRadius: radius.lg,
              border: `1px solid ${colors.borderSubtle}`,
              backgroundColor: colors.bgSecondary,
            }}
          >
            <div
              style={{
                fontSize: font.sizeXs,
                fontWeight: font.weightMedium,
                color: colors.textMuted,
                marginBottom: 6,
                letterSpacing: '-0.01em',
              }}
            >
              {card.label}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: font.weightSemibold,
                color: card.color,
                letterSpacing: '-0.03em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: font.sizeSm, color: colors.textSecondary }}>
        Сделок в месяце: {finance.dealCount} · позиций: {finance.positionCount}
      </div>

      <div
        style={{
          border: `1px solid ${colors.border}`,
          borderRadius: radius.lg,
          backgroundColor: colors.bgElevated,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            borderBottom: `1px solid ${colors.borderSubtle}`,
            fontWeight: font.weightSemibold,
            fontSize: font.sizeSm,
          }}
        >
          Расходы по статьям
        </div>
        {BREAKDOWN_ROWS.map((row) => (
          <div
            key={row.key}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: spacing.md,
              padding: `${spacing.sm} ${spacing.md}`,
              borderBottom: `1px solid ${colors.borderSubtle}`,
              fontSize: font.sizeSm,
            }}
          >
            <span style={{ color: colors.textSecondary }}>{row.label}</span>
            <span style={{ color: colors.text, fontWeight: font.weightMedium }}>
              {formatRub(finance.breakdown[row.key])}
            </span>
          </div>
        ))}
      </div>

      {finance.expenseRub === 0 ? (
        <div style={{ fontSize: font.sizeSm, color: colors.textMuted }}>
          Расходы пока 0 — на локали нет синка `rashod*` из внешних таблиц. Поля уже в CRM: можно
          заполнить вручную или подтянуть с twentyserver.
        </div>
      ) : null}
    </div>
  );
};
