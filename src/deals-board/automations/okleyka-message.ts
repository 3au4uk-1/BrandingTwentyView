import { getTipDetailLabel } from 'src/constants/tip-detail';

import type { LineItemRow, OpportunityRow } from '../types';

export type OkleykaMessageContext = {
  opportunity: Pick<OpportunityRow, 'name' | 'loadDate'>;
  lineItem: Pick<
    LineItemRow,
    'name' | 'kolichestvo' | 'tipDetail' | 'plenka' | 'kommentariy'
  >;
};

const formatLoadDate = (loadDate: string | undefined): string => {
  if (!loadDate) return '—';
  const date = new Date(loadDate);
  if (Number.isNaN(date.getTime())) return loadDate;
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const resolveFilm = (lineItem: OkleykaMessageContext['lineItem']): string => {
  if (typeof lineItem.tipDetail === 'string' && lineItem.tipDetail) {
    return getTipDetailLabel(lineItem.tipDetail);
  }
  const markdown = lineItem.plenka?.markdown?.trim();
  if (markdown) {
    const first = markdown.split(/\r?\n/)[0]?.trim();
    if (first) return first.slice(0, 80);
  }
  return '—';
};

export const buildOkleykaMessage = ({
  opportunity,
  lineItem,
}: OkleykaMessageContext): string => {
  const qty =
    typeof lineItem.kolichestvo === 'number' && Number.isFinite(lineItem.kolichestvo)
      ? lineItem.kolichestvo
      : 1;

  return [
    `Заказ: ${opportunity.name || '—'}`,
    `Бронь: ${formatLoadDate(opportunity.loadDate)}`,
    `Плёнка: ${resolveFilm(lineItem)}`,
    `Оборудование: ${lineItem.name || '—'} × ${qty}`,
  ].join('\n');
};
