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
    const profitRub = saleRub - printCostRub - frezaCostRub;
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
        Math.round(row.profitRub),
        row.marginPct === null ? '' : row.marginPct.toFixed(1),
      ]
        .map(escape)
        .join(';'),
    ),
  ];
  return `\uFEFF${lines.join('\n')}`;
};
