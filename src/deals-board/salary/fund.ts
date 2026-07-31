import type { OkleykaDealGroup } from './compute';

export type OkleykaSalaryEntry = {
  id: string;
  name: string;
  hours: number;
  rateRub: number;
  periodStart: string;
  periodEnd: string;
};

export const entrySumRub = (entry: OkleykaSalaryEntry): number =>
  entry.hours * entry.rateRub;

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

/** Spread remainder over deals with empty/zero okleyka, proportional to sale. */
export const distributeRemainder = (
  groups: OkleykaDealGroup[],
  remainderRub: number,
): Array<{ opportunityId: string; okleykaRub: number }> => {
  if (remainderRub <= 0) return [];
  const targets = groups.filter(
    (g) => (g.okleykaCostRub === null || g.okleykaCostRub === 0) && g.saleRub > 0,
  );
  const totalSale = targets.reduce((s, g) => s + g.saleRub, 0);
  if (targets.length === 0 || totalSale <= 0) return [];

  const result = targets.map((g) => ({
    opportunityId: g.opportunityId,
    okleykaRub: Math.round((remainderRub * g.saleRub) / totalSale),
  }));
  const diff = remainderRub - result.reduce((s, r) => s + r.okleykaRub, 0);
  if (diff !== 0) {
    const largest = targets.reduce((max, g) => (g.saleRub > max.saleRub ? g : max), targets[0]!);
    const target = result.find((r) => r.opportunityId === largest.opportunityId)!;
    target.okleykaRub += diff;
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
