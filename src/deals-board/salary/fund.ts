import type { OkleykaDealGroup } from './compute';
import { entryHalf, halfPeriod, type OkleykaHalf, type SalaryPeriod } from './date-range';

export type OkleykaSalaryEntry = {
  id: string;
  name: string;
  hours: number;
  rateRub: number;
  bonusRub: number;
  periodStart: string;
  periodEnd: string;
};

export const entrySumRub = (entry: OkleykaSalaryEntry): number =>
  entry.hours * entry.rateRub + entry.bonusRub;

export const sumFundRub = (entries: OkleykaSalaryEntry[]): number =>
  entries.reduce((s, e) => s + entrySumRub(e), 0);

export type FundSummary = { fundRub: number; spentRub: number; remainderRub: number };

export const buildFundSummary = (
  entries: OkleykaSalaryEntry[],
  groups: OkleykaDealGroup[],
): FundSummary => {
  const fundRub = sumFundRub(entries);
  const spentRub = groups.reduce((s, g) => s + (g.okleykaCostRub ?? 0), 0);
  return { fundRub, spentRub, remainderRub: fundRub - spentRub };
};

export const filledOkleykaDealIds = (groups: OkleykaDealGroup[]): string[] =>
  groups.filter((g) => (g.okleykaCostRub ?? 0) > 0).map((g) => g.opportunityId);

/** «по продаже ≈ N ₽» — deal's proportional share of the fund by sale. */
export const saleShareHintRub = (
  dealSaleRub: number,
  groups: OkleykaDealGroup[],
  fundRub: number,
): number | null => {
  if (fundRub <= 0) return null;
  const totalSale = groups.reduce((s, g) => s + g.saleRub, 0);
  if (totalSale <= 0 || dealSaleRub <= 0) return null;
  return Math.round((fundRub * dealSaleRub) / totalSale);
};

export type DistributeRule = 'sale' | 'equal' | 'margin';

export const DISTRIBUTE_RULES: Array<{ key: DistributeRule; label: string; hint: string }> = [
  { key: 'sale', label: 'По продаже', hint: 'пропорционально сумме продажи' },
  { key: 'equal', label: 'Поровну', hint: 'одинаковая сумма каждой сделке' },
  { key: 'margin', label: 'Выровнять маржу', hint: 'после распределения маржа сделок сравняется' },
];

/** Raw (unrounded) shares per target deal for a given rule. */
const ruleShares = (
  targets: OkleykaDealGroup[],
  remainderRub: number,
  rule: DistributeRule,
): Map<string, number> => {
  const shares = new Map<string, number>();
  if (rule === 'equal') {
    const each = remainderRub / targets.length;
    for (const g of targets) shares.set(g.opportunityId, each);
    return shares;
  }
  if (rule === 'margin') {
    // Water-filling: pick a common margin level m so that
    // okleyka_i = profit_i − m·sale_i, Σ okleyka_i = remainder, okleyka_i ≥ 0.
    let active = [...targets];
    for (;;) {
      const profitSum = active.reduce((s, g) => s + g.profitRub, 0);
      const saleSum = active.reduce((s, g) => s + g.saleRub, 0);
      if (active.length === 0 || saleSum <= 0) break;
      const m = (profitSum - remainderRub) / saleSum;
      const next = active.filter((g) => g.profitRub - m * g.saleRub > 0);
      if (next.length === active.length) {
        for (const g of targets) shares.set(g.opportunityId, 0);
        for (const g of active) shares.set(g.opportunityId, g.profitRub - m * g.saleRub);
        return shares;
      }
      if (next.length === 0) break;
      active = next;
    }
    // Degenerate case — fall back to sale-proportional.
  }
  const totalSale = targets.reduce((s, g) => s + g.saleRub, 0);
  for (const g of targets) {
    shares.set(g.opportunityId, totalSale > 0 ? (remainderRub * g.saleRub) / totalSale : 0);
  }
  return shares;
};

/** Spread remainder over deals with empty/zero okleyka using the selected rule. */
export const distributeRemainder = (
  groups: OkleykaDealGroup[],
  remainderRub: number,
  rule: DistributeRule = 'sale',
): Array<{ opportunityId: string; okleykaRub: number }> => {
  if (remainderRub <= 0) return [];
  const targets = groups.filter(
    (g) => g.okleykaCostRub === null || g.okleykaCostRub === 0,
  );
  if (targets.length === 0) return [];

  const totalSale = targets.reduce((s, g) => s + g.saleRub, 0);
  const hasZeroSaleTarget = targets.some((g) => g.saleRub === 0);
  const effectiveRule: DistributeRule =
    (rule === 'sale' || rule === 'margin') && (hasZeroSaleTarget || totalSale === 0)
      ? 'equal'
      : rule;

  const shares = ruleShares(targets, remainderRub, effectiveRule);
  const result = targets.map((g) => ({
    opportunityId: g.opportunityId,
    okleykaRub: Math.round(shares.get(g.opportunityId) ?? 0),
  }));
  const diff = remainderRub - result.reduce((s, r) => s + r.okleykaRub, 0);
  if (diff !== 0) {
    const largest = result.reduce((max, r) => (r.okleykaRub > max.okleykaRub ? r : max), result[0]!);
    largest.okleykaRub += diff;
  }
  return result.filter((r) => r.okleykaRub > 0);
};

/** Latest fully finished period among candidate entries (max periodEnd, then max periodStart). */
export const pickPreviousPeriodEntries = (
  entries: OkleykaSalaryEntry[],
): OkleykaSalaryEntry[] => {
  if (entries.length === 0) return [];
  let best = '';
  for (const e of entries) {
    const key = `${e.periodEnd}_${e.periodStart}`;
    if (key > best) best = key;
  }
  return entries.filter((e) => `${e.periodEnd}_${e.periodStart}` === best);
};

export const latestRateByName = (
  entries: OkleykaSalaryEntry[],
  name: string,
): number | null => {
  const needle = name.trim().toLowerCase();
  if (!needle) return null;
  let bestEnd = '';
  let rate: number | null = null;
  for (const e of entries) {
    if (e.name.trim().toLowerCase() !== needle) continue;
    if (e.periodEnd > bestEnd) {
      bestEnd = e.periodEnd;
      rate = e.rateRub;
    }
  }
  return rate;
};

export const filterGroupsInPeriod = (
  groups: OkleykaDealGroup[],
  period: SalaryPeriod,
): OkleykaDealGroup[] =>
  groups.filter((g) => {
    const day = g.eventDate.slice(0, 10);
    return day >= period.dateFrom && day <= period.dateTo;
  });

export const buildHalfDistributeScope = (args: {
  half: OkleykaHalf;
  year: number;
  monthIndex: number;
  splitDay: number;
  entries: OkleykaSalaryEntry[];
  groups: OkleykaDealGroup[];
  rule: DistributeRule;
}) => {
  const period = halfPeriod(args.year, args.monthIndex, args.half, args.splitDay);
  const halfEntries = args.entries.filter((e) => entryHalf(e.periodStart) === args.half);
  const halfGroups = filterGroupsInPeriod(args.groups, period);
  const fund = buildFundSummary(halfEntries, halfGroups);
  const distribution = distributeRemainder(halfGroups, fund.remainderRub, args.rule);
  return { period, entries: halfEntries, groups: halfGroups, fund, distribution };
};
