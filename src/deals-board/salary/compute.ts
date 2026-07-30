import { currencyToRub, formatRub, type CurrencyAmount } from '../analytics/compute';
import type { LineItemRow, OpportunityRow } from '../types';

export type OkleykaSalaryRow = {
  lineItemId: string;
  opportunityId: string;
  bitrixUrl: string;
  dealName: string;
  positionName: string;
  qty: number;
  saleRub: number;
  printCostRub: number;
  frezaCostRub: number;
  okleykaCostRub: number;
  costRub: number;
  profitRub: number;
  marginPct: number | null;
};

export const isOkleykaSalaryLineItem = (item: LineItemRow): boolean =>
  item.tip === 'PLENKA' &&
  item.tipDetail === 'NASHI' &&
  (item.stage === 'OKLEYKA' || item.stage === 'GOTOVO');

export const buildOkleykaSalaryRows = (
  lineItems: LineItemRow[],
  dealsById: Map<string, OpportunityRow>,
): OkleykaSalaryRow[] => {
  const rows: OkleykaSalaryRow[] = [];

  for (const item of lineItems) {
    if (!isOkleykaSalaryLineItem(item)) continue;
    const deal = dealsById.get(item.opportunityId);
    const saleRub = currencyToRub(item.amount as CurrencyAmount | undefined);
    const printCostRub = currencyToRub(item.stoimostPechati as CurrencyAmount | undefined);
    const frezaCostRub = currencyToRub(item.stoimostFrezy as CurrencyAmount | undefined);
    const okleykaCostRub = currencyToRub(item.stoimostOkleyki as CurrencyAmount | undefined);
    const costRub = printCostRub + frezaCostRub + okleykaCostRub;
    const profitRub = saleRub - costRub;
    const marginPct = saleRub > 0 ? (profitRub / saleRub) * 100 : null;

    rows.push({
      lineItemId: item.id,
      opportunityId: item.opportunityId,
      bitrixUrl: deal?.bitrixLink?.primaryLinkUrl?.trim() ?? '',
      dealName: deal?.name ?? '—',
      positionName: item.name || '—',
      qty: typeof item.kolichestvo === 'number' ? item.kolichestvo : 0,
      saleRub,
      printCostRub,
      frezaCostRub,
      okleykaCostRub,
      costRub,
      profitRub,
      marginPct,
    });
  }

  return rows.sort((a, b) => {
    const byDeal = a.dealName.localeCompare(b.dealName, 'ru');
    if (byDeal !== 0) return byDeal;
    return a.positionName.localeCompare(b.positionName, 'ru');
  });
};

export type OkleykaSalaryTotals = {
  count: number;
  sale: number;
  print: number;
  freza: number;
  okleyka: number;
  cost: number;
  profit: number;
  marginPct: number | null;
};

export const sumOkleykaSalaryTotals = (rows: OkleykaSalaryRow[]): OkleykaSalaryTotals => {
  const sale = rows.reduce((s, r) => s + r.saleRub, 0);
  const print = rows.reduce((s, r) => s + r.printCostRub, 0);
  const freza = rows.reduce((s, r) => s + r.frezaCostRub, 0);
  const okleyka = rows.reduce((s, r) => s + r.okleykaCostRub, 0);
  const cost = print + freza + okleyka;
  const profit = sale - cost;
  return {
    count: rows.length,
    sale,
    print,
    freza,
    okleyka,
    cost,
    profit,
    marginPct: sale > 0 ? (profit / sale) * 100 : null,
  };
};

export type OkleykaSalaryGroup = {
  opportunityId: string;
  dealName: string;
  bitrixUrl: string;
  rows: OkleykaSalaryRow[];
  totals: OkleykaSalaryTotals;
};

export const buildOkleykaSalaryGroups = (rows: OkleykaSalaryRow[]): OkleykaSalaryGroup[] => {
  const byDeal = new Map<string, OkleykaSalaryRow[]>();
  for (const row of rows) {
    const list = byDeal.get(row.opportunityId) ?? [];
    list.push(row);
    byDeal.set(row.opportunityId, list);
  }
  const groups: OkleykaSalaryGroup[] = [];
  for (const [opportunityId, groupRows] of byDeal) {
    const first = groupRows[0]!;
    groups.push({
      opportunityId,
      dealName: first.dealName,
      bitrixUrl: first.bitrixUrl,
      rows: [...groupRows].sort((a, b) => a.positionName.localeCompare(b.positionName, 'ru')),
      totals: sumOkleykaSalaryTotals(groupRows),
    });
  }
  return groups.sort((a, b) => a.dealName.localeCompare(b.dealName, 'ru'));
};

export type OkleykaSortKey =
  | 'saleRub'
  | 'printCostRub'
  | 'frezaCostRub'
  | 'okleykaCostRub'
  | 'profitRub'
  | 'marginPct';

const metricValue = (row: OkleykaSalaryRow, key: OkleykaSortKey): number => {
  const value = row[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
};

const groupMetricValue = (group: OkleykaSalaryGroup, key: OkleykaSortKey): number => {
  if (key === 'saleRub') return group.totals.sale;
  if (key === 'printCostRub') return group.totals.print;
  if (key === 'frezaCostRub') return group.totals.freza;
  if (key === 'okleykaCostRub') return group.totals.okleyka;
  if (key === 'profitRub') return group.totals.profit;
  return group.totals.marginPct ?? Number.NEGATIVE_INFINITY;
};

export const sortOkleykaSalaryGroups = (
  groups: OkleykaSalaryGroup[],
  key: OkleykaSortKey,
  direction: 'asc' | 'desc',
): OkleykaSalaryGroup[] => {
  const sign = direction === 'asc' ? 1 : -1;
  return [...groups]
    .map((group) => ({
      ...group,
      rows: [...group.rows].sort(
        (a, b) => sign * (metricValue(a, key) - metricValue(b, key)),
      ),
    }))
    .sort((a, b) => sign * (groupMetricValue(a, key) - groupMetricValue(b, key)));
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

export const salaryRowsToCsv = (rows: OkleykaSalaryRow[]): string => {
  const header = [
    'Bitrix',
    'Сделка',
    'Позиция',
    'Кол-во',
    'Сумма продажи',
    'Расход печать',
    'Расход фреза',
    'Расход оклейка',
    'Прибыль',
    'Маржа %',
  ];
  const escape = (value: string | number) => {
    const text = String(value);
    if (/[;"\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
    return text;
  };
  const lines = [
    header.join(';'),
    ...rows.map((row) =>
      [
        row.bitrixUrl,
        row.dealName,
        row.positionName,
        row.qty,
        Math.round(row.saleRub),
        Math.round(row.printCostRub),
        Math.round(row.frezaCostRub),
        Math.round(row.okleykaCostRub),
        Math.round(row.profitRub),
        row.marginPct === null ? '' : row.marginPct.toFixed(1),
      ]
        .map(escape)
        .join(';'),
    ),
  ];
  return `\uFEFF${lines.join('\n')}`;
};

/** Sheet matrix for Excel export (header + data rows). */
export const salaryRowsToXlsxMatrix = (
  rows: OkleykaSalaryRow[],
): Array<Array<string | number>> => {
  const header = [
    'Bitrix',
    'Сделка',
    'Позиция',
    'Кол-во',
    'Сумма продажи',
    'Расход печать',
    'Расход фреза',
    'Расход оклейка',
    'Прибыль',
    'Маржа %',
  ];
  return [
    header,
    ...rows.map((row) => [
      row.bitrixUrl,
      row.dealName,
      row.positionName,
      row.qty,
      Math.round(row.saleRub),
      Math.round(row.printCostRub),
      Math.round(row.frezaCostRub),
      Math.round(row.okleykaCostRub),
      Math.round(row.profitRub),
      row.marginPct === null ? '' : Number(row.marginPct.toFixed(1)),
    ]),
  ];
};

export const buildOkleykaSalaryFilename = (date = new Date()): string =>
  `okleyka-salary-${date.toISOString().slice(0, 10)}.xlsx`;
