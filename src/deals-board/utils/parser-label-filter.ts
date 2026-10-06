import { BOARD_STREAM, type BoardStream } from 'src/constants/product-stream';

import type { LineItemListStatus } from '../api/crmparser';
import type { ChipColor } from '../Chip';

export type ParserLabelId =
  | 'restoration'
  | 'banner'
  | 'podryad'
  | 'blacklist'
  | 'decorBlacklist'
  | 'mkBlacklist';

export type ParserLabelDef = {
  id: ParserLabelId;
  label: string;
  color: ChipColor;
  matches: (status: LineItemListStatus) => boolean;
};

const BRANDING_LABELS: ParserLabelDef[] = [
  {
    id: 'restoration',
    label: 'Реставрация',
    color: 'yellow',
    matches: (status) => status.restorationMatch,
  },
  {
    id: 'banner',
    label: 'Баннер',
    color: 'green',
    matches: (status) => status.bannerMatch,
  },
  {
    id: 'podryad',
    label: 'Подряд',
    color: 'blue',
    matches: (status) => status.podryadMatch,
  },
  {
    id: 'blacklist',
    label: 'Блеклист',
    color: 'red',
    matches: (status) => status.blacklisted,
  },
];

const DECOR_MK_LABELS: ParserLabelDef[] = [
  {
    id: 'decorBlacklist',
    label: 'Блеклист декор',
    color: 'red',
    matches: (status) => Boolean(status.decorBlacklisted),
  },
  {
    id: 'mkBlacklist',
    label: 'Блеклист МК',
    color: 'red',
    matches: (status) => Boolean(status.mkBlacklisted),
  },
];

const ALL_LABELS: ParserLabelDef[] = [...BRANDING_LABELS, ...DECOR_MK_LABELS];

const LABEL_IDS = new Set<string>(ALL_LABELS.map((label) => label.id));

export const parserLabelsForBoard = (boardStream: BoardStream): ParserLabelDef[] =>
  boardStream === BOARD_STREAM.DECOR_MK ? DECOR_MK_LABELS : BRANDING_LABELS;

export const parseHiddenParserLabels = (raw: string | null): ParserLabelId[] => {
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is ParserLabelId => typeof value === 'string' && LABEL_IDS.has(value));
  } catch {
    return [];
  }
};

export const isLineItemHiddenByParserLabels = (
  status: LineItemListStatus | null | undefined,
  hidden: ReadonlySet<ParserLabelId>,
): boolean => {
  if (hidden.size === 0 || !status) return false;
  return ALL_LABELS.some((label) => hidden.has(label.id) && label.matches(status));
};

type LabeledLineItem = {
  id: string;
  opportunityId: string;
};

/**
 * Hide positions whose parser label is turned off.
 * Positions without that label (commerce and anything else) stay.
 * A deal stays while it still has a visible position, or while its positions are not loaded yet.
 */
export const filterBoardByParserLabels = <TItem extends LabeledLineItem, TDeal extends { id: string }>(
  items: readonly TItem[],
  deals: readonly TDeal[],
  statuses: Record<string, LineItemListStatus | null | undefined> | undefined,
  hidden: ReadonlySet<ParserLabelId>,
): { items: TItem[]; deals: TDeal[] } => {
  if (hidden.size === 0) {
    return { items: [...items], deals: [...deals] };
  }

  const nextItems = items.filter(
    (item) => !isLineItemHiddenByParserLabels(statuses?.[item.id], hidden),
  );
  const remainingByOpp = new Set(nextItems.map((item) => item.opportunityId));
  const oppsWithItems = new Set(items.map((item) => item.opportunityId));

  const nextDeals = deals.filter((deal) => {
    if (!oppsWithItems.has(deal.id)) return true;
    return remainingByOpp.has(deal.id);
  });

  return { items: nextItems, deals: nextDeals };
};
