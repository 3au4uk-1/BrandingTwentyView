import { toLocalInputDate } from '../utils/date-filters';
import type { LineItemRow, OpportunityRow } from '../types';

export type CurrencyAmount = {
  amountMicros?: number | null;
  currencyCode?: string | null;
};

export type ExpenseBreakdown = {
  pechat: number;
  frezerovka: number;
  logistika: number;
  vyezdnayaKomanda: number;
  beznal: number;
};

export type MonthlyFinance = {
  monthKey: string;
  monthLabel: string;
  dealCount: number;
  positionCount: number;
  turnoverRub: number;
  expenseRub: number;
  marginRub: number;
  marginPct: number | null;
  breakdown: ExpenseBreakdown;
};

export const currencyToRub = (value: CurrencyAmount | null | undefined): number => {
  const micros = value?.amountMicros;
  if (typeof micros !== 'number' || !Number.isFinite(micros)) return 0;
  return micros / 1_000_000;
};

export const formatRub = (value: number): string =>
  new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);

export const formatMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
};

export const getMonthKey = (date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const shiftMonthKey = (monthKey: string, delta: number): string => {
  const [year, month] = monthKey.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return getMonthKey(date);
};

const opportunityInMonth = (opportunity: OpportunityRow, monthKey: string): boolean => {
  if (!opportunity.loadDate) return false;
  const day = toLocalInputDate(String(opportunity.loadDate));
  return Boolean(day && day.startsWith(monthKey));
};

export const computeMonthlyFinance = (
  opportunities: OpportunityRow[],
  lineItems: LineItemRow[],
  monthKey: string,
): MonthlyFinance => {
  const deals = opportunities.filter(
    (opportunity) =>
      opportunityInMonth(opportunity, monthKey) && opportunity.stage !== 'OTMENA',
  );
  const dealIds = new Set(deals.map((deal) => deal.id));

  const positions = lineItems.filter(
    (item) => dealIds.has(item.opportunityId) && item.stage !== 'OTMENA',
  );

  const turnoverRub = positions.reduce(
    (sum, item) => sum + currencyToRub(item.amount),
    0,
  );

  const breakdown: ExpenseBreakdown = {
    pechat: 0,
    frezerovka: 0,
    logistika: 0,
    vyezdnayaKomanda: 0,
    beznal: 0,
  };

  let expenseRub = 0;
  for (const deal of deals) {
    expenseRub += currencyToRub(deal.rashodItogo as CurrencyAmount | undefined);
    breakdown.pechat += currencyToRub(deal.rashodPechat as CurrencyAmount | undefined);
    breakdown.frezerovka += currencyToRub(deal.rashodFrezerovka as CurrencyAmount | undefined);
    breakdown.logistika += currencyToRub(deal.rashodLogistika as CurrencyAmount | undefined);
    breakdown.vyezdnayaKomanda += currencyToRub(
      deal.rashodVyezdnayaKomanda as CurrencyAmount | undefined,
    );
    breakdown.beznal += currencyToRub(deal.rashodBeznal as CurrencyAmount | undefined);
  }

  const marginRub = turnoverRub - expenseRub;
  const marginPct = turnoverRub > 0 ? (marginRub / turnoverRub) * 100 : null;

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey),
    dealCount: deals.length,
    positionCount: positions.length,
    turnoverRub,
    expenseRub,
    marginRub,
    marginPct,
    breakdown,
  };
};
