import type { LineItemRow, OpportunityRow } from '../types';

export type OkleykaMessageContext = {
  opportunity: Pick<OpportunityRow, 'name' | 'loadDate'>;
  lineItem: Pick<
    LineItemRow,
    'name' | 'kolichestvo' | 'tipDetail' | 'plenka' | 'kommentariy'
  >;
};

export type OkleykaMessageDraft = {
  order: string;
  booking: string;
  film: string;
  equipment: string;
  comment: string;
};

export const extractBookingId = (name: string | undefined): string => {
  if (!name) return '';
  const match = name.match(/\d{5,6}/);
  return match?.[0] ?? '';
};

const firstPlenkaLine = (plenka: { markdown?: string } | null | undefined): string => {
  const first = plenka?.markdown?.trim().split(/\r?\n/)[0]?.trim() ?? '';
  return first.slice(0, 80);
};

export const buildOkleykaDraft = ({
  opportunity,
  lineItem,
}: OkleykaMessageContext): OkleykaMessageDraft => {
  const qty =
    typeof lineItem.kolichestvo === 'number' && Number.isFinite(lineItem.kolichestvo)
      ? lineItem.kolichestvo
      : 1;
  const film = firstPlenkaLine(lineItem.plenka) || '—';

  return {
    order: opportunity.name || '—',
    booking: extractBookingId(opportunity.name) || '—',
    film,
    equipment: `${lineItem.name || '—'} × ${qty}`,
    comment: lineItem.kommentariy?.trim() ?? '',
  };
};

export const formatOkleykaMessage = (draft: OkleykaMessageDraft): string => {
  const lines = [
    `Заказ: ${draft.order || '—'}`,
    `Бронь: ${draft.booking || '—'}`,
    `Плёнка: ${draft.film || '—'}`,
    `Оборудование: ${draft.equipment || '—'}`,
  ];
  const comment = draft.comment.trim();
  if (comment) lines.push(`Комментарий: ${comment}`);
  return lines.join('\n');
};

export const buildOkleykaMessage = (ctx: OkleykaMessageContext): string =>
  formatOkleykaMessage(buildOkleykaDraft(ctx));
