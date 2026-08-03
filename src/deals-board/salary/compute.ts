import { currencyToRub, formatRub, type CurrencyAmount } from '../analytics/compute';
import type { LineItemRow, OpportunityRow } from '../types';
import { toLocalInputDate } from '../utils/date-filters';
import { getOpportunityEffectiveDate } from '../utils/resolve-opportunity-date';

export const isOkleykaSalaryLineItem = (item: LineItemRow): boolean =>
  item.tip === 'PLENKA' &&
  item.tipDetail === 'NASHI' &&
  (item.stage === 'OKLEYKA' || item.stage === 'GOTOVO');

export type OkleykaPositionRow = {
  lineItemId: string;
  opportunityId: string;
  positionName: string;
  qty: number;
  unitPriceRub: number;
  saleRub: number;
};

export type OkleykaDealGroup = {
  opportunityId: string;
  dealName: string;
  bitrixUrl: string;
  positions: OkleykaPositionRow[];
  saleRub: number;
  printCostRub: number;
  frezaCostRub: number;
  okleykaCostRub: number | null;
  costRub: number;
  profitRub: number;
  marginPct: number | null;
  eventDate: string;
};

const currencyToRubOrNull = (value: unknown): number | null => {
  if (!value || typeof value !== 'object') return null;
  const micros = (value as { amountMicros?: unknown }).amountMicros;
  if (typeof micros !== 'number' || !Number.isFinite(micros)) return null;
  return micros / 1_000_000;
};

const dealEconomics = (
  saleRub: number,
  printCostRub: number,
  frezaCostRub: number,
  okleykaCostRub: number | null,
) => {
  const costRub = printCostRub + frezaCostRub + (okleykaCostRub ?? 0);
  const profitRub = saleRub - costRub;
  return {
    costRub,
    profitRub,
    marginPct: saleRub > 0 ? (profitRub / saleRub) * 100 : null,
  };
};

export const buildOkleykaDealGroups = (
  lineItems: LineItemRow[],
  dealsById: Map<string, OpportunityRow>,
): OkleykaDealGroup[] => {
  const positionsByDeal = new Map<string, OkleykaPositionRow[]>();
  for (const item of lineItems) {
    if (!isOkleykaSalaryLineItem(item)) continue;
    if (!dealsById.has(item.opportunityId)) continue;
    const unitPriceRub = currencyToRub(item.amount as CurrencyAmount | undefined);
    const qty =
      typeof item.kolichestvo === 'number' && item.kolichestvo > 0 ? item.kolichestvo : 1;
    const list = positionsByDeal.get(item.opportunityId) ?? [];
    list.push({
      lineItemId: item.id,
      opportunityId: item.opportunityId,
      positionName: item.name || '—',
      qty,
      unitPriceRub,
      saleRub: unitPriceRub * qty,
    });
    positionsByDeal.set(item.opportunityId, list);
  }

  const groups: OkleykaDealGroup[] = [];
  for (const [opportunityId, positions] of positionsByDeal) {
    const deal = dealsById.get(opportunityId)!;
    const saleRub = positions.reduce((s, p) => s + p.saleRub, 0);
    const printCostRub = currencyToRub(deal.rashodPechat as CurrencyAmount | undefined);
    const frezaCostRub = currencyToRub(deal.rashodFrezerovka as CurrencyAmount | undefined);
    const okleykaCostRub = currencyToRubOrNull(deal.rashodOkleyka);
    const effective = getOpportunityEffectiveDate(deal);
    const eventDate = effective
      ? (toLocalInputDate(effective) ?? effective.slice(0, 10))
      : '';
    groups.push({
      opportunityId,
      dealName: deal.name || '—',
      bitrixUrl: deal.bitrixLink?.primaryLinkUrl?.trim() ?? '',
      positions: [...positions].sort((a, b) =>
        a.positionName.localeCompare(b.positionName, 'ru'),
      ),
      saleRub,
      printCostRub,
      frezaCostRub,
      okleykaCostRub,
      eventDate,
      ...dealEconomics(saleRub, printCostRub, frezaCostRub, okleykaCostRub),
    });
  }
  return groups.sort((a, b) => a.dealName.localeCompare(b.dealName, 'ru'));
};

export const applyDealOkleykaOverride = (
  group: OkleykaDealGroup,
  okleykaCostRub: number | null,
): OkleykaDealGroup => ({
  ...group,
  okleykaCostRub,
  ...dealEconomics(group.saleRub, group.printCostRub, group.frezaCostRub, okleykaCostRub),
});

export type OkleykaDealTotals = {
  deals: number;
  positions: number;
  sale: number;
  print: number;
  freza: number;
  okleyka: number;
  cost: number;
  profit: number;
  marginPct: number | null;
};

export const sumOkleykaDealTotals = (groups: OkleykaDealGroup[]): OkleykaDealTotals => {
  const sale = groups.reduce((s, g) => s + g.saleRub, 0);
  const print = groups.reduce((s, g) => s + g.printCostRub, 0);
  const freza = groups.reduce((s, g) => s + g.frezaCostRub, 0);
  const okleyka = groups.reduce((s, g) => s + (g.okleykaCostRub ?? 0), 0);
  const cost = print + freza + okleyka;
  const profit = sale - cost;
  return {
    deals: groups.length,
    positions: groups.reduce((s, g) => s + g.positions.length, 0),
    sale,
    print,
    freza,
    okleyka,
    cost,
    profit,
    marginPct: sale > 0 ? (profit / sale) * 100 : null,
  };
};

export type OkleykaSortKey =
  | 'date'
  | 'sale'
  | 'print'
  | 'freza'
  | 'okleyka'
  | 'profit'
  | 'margin';

const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' });

export const formatOkleykaEventDate = (eventDate: string): string => {
  if (!eventDate) return '—';
  const date = new Date(eventDate.length === 10 ? `${eventDate}T12:00:00` : eventDate);
  if (Number.isNaN(date.getTime())) return '—';
  return shortDateFormatter.format(date);
};

const groupMetric = (group: OkleykaDealGroup, key: OkleykaSortKey): number => {
  if (key === 'sale') return group.saleRub;
  if (key === 'print') return group.printCostRub;
  if (key === 'freza') return group.frezaCostRub;
  if (key === 'okleyka') return group.okleykaCostRub ?? Number.NEGATIVE_INFINITY;
  if (key === 'profit') return group.profitRub;
  return group.marginPct ?? Number.NEGATIVE_INFINITY;
};

export const sortOkleykaDealGroups = (
  groups: OkleykaDealGroup[],
  key: OkleykaSortKey,
  direction: 'asc' | 'desc',
): OkleykaDealGroup[] => {
  const sign = direction === 'asc' ? 1 : -1;
  return [...groups].sort((a, b) => {
    if (key === 'date') {
      const aEmpty = !a.eventDate;
      const bEmpty = !b.eventDate;
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1;
      if (bEmpty) return -1;
      return sign * a.eventDate.localeCompare(b.eventDate);
    }
    return sign * (groupMetric(a, key) - groupMetric(b, key));
  });
};

export const dealGroupsToXlsxMatrix = (
  groups: OkleykaDealGroup[],
): Array<Array<string | number>> => {
  const header = [
    'Bitrix',
    'Сделка',
    'Дата',
    'Позиций',
    'Продажа',
    'Расход печать',
    'Расход фреза',
    'Расход оклейка',
    'Расход итого',
    'Прибыль',
    'Маржа %',
  ];
  return [
    header,
    ...groups.map((g) => [
      g.bitrixUrl,
      g.dealName,
      g.eventDate || '',
      g.positions.length,
      Math.round(g.saleRub),
      Math.round(g.printCostRub),
      Math.round(g.frezaCostRub),
      g.okleykaCostRub === null ? '' : Math.round(g.okleykaCostRub),
      Math.round(g.costRub),
      Math.round(g.profitRub),
      g.marginPct === null ? '' : Number(g.marginPct.toFixed(1)),
    ]),
  ];
};

export const marginPctTone = (
  marginPct: number | null,
): 'muted' | 'danger' | 'warning' | 'ok' => {
  if (marginPct === null || !Number.isFinite(marginPct)) return 'muted';
  if (marginPct < 0) return 'danger';
  if (marginPct < 20) return 'warning';
  return 'ok';
};

export const formatMarginPct = (value: number | null): string => {
  if (value === null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(1)}%`;
};

export const formatSalaryRub = formatRub;

export const buildOkleykaSalaryFilename = (date = new Date()): string =>
  `okleyka-salary-${date.toISOString().slice(0, 10)}.xlsx`;
