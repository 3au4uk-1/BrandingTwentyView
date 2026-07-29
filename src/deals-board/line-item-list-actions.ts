import { BOARD_STREAM, type BoardStream } from 'src/constants/product-stream';

import type { LineItemListStatus, ListName } from './api/crmparser';

export type LineItemListAction = {
  list: ListName;
  label: string;
  shortLabel: string;
  isActive: (status: LineItemListStatus | null | undefined) => boolean;
};

export const LINE_ITEM_LIST_ACTIONS: LineItemListAction[] = [
  {
    list: 'blacklist',
    label: 'В блеклист',
    shortLabel: 'БЛ',
    isActive: (status) => Boolean(status?.blacklisted),
  },
  {
    list: 'restoration',
    label: 'В реставрацию',
    shortLabel: 'Р',
    isActive: (status) => Boolean(status?.restorationMatch),
  },
  {
    list: 'podryad',
    label: 'В подряд',
    shortLabel: 'П',
    isActive: (status) => Boolean(status?.podryadMatch),
  },
  {
    list: 'banner',
    label: 'В баннер',
    shortLabel: 'БН',
    isActive: (status) => Boolean(status?.bannerMatch),
  },
  {
    list: 'ne_nashe_branding',
    label: 'В не наше',
    shortLabel: 'НН',
    isActive: (status) => Boolean(status?.neNasheBrandingMatch),
  },
  {
    list: 'decor_blacklist',
    label: 'В блеклист декор',
    shortLabel: 'БД',
    isActive: (status) => Boolean(status?.decorBlacklisted),
  },
  {
    list: 'mk_blacklist',
    label: 'В блеклист МК',
    shortLabel: 'БМ',
    isActive: (status) => Boolean(status?.mkBlacklisted),
  },
  {
    list: 'ne_nashe_decor_mk',
    label: 'В не наше',
    shortLabel: 'НН',
    isActive: (status) => Boolean(status?.neNasheDecorMkMatch),
  },
];

const BRANDING_BOARD_LISTS = new Set<ListName>([
  'blacklist',
  'restoration',
  'podryad',
  'banner',
  'ne_nashe_branding',
]);

const DECOR_MK_BOARD_LISTS = new Set<ListName>([
  'decor_blacklist',
  'mk_blacklist',
  'ne_nashe_decor_mk',
]);

export function filterActionsForBoardStream(boardStream: BoardStream): LineItemListAction[] {
  const allowedLists =
    boardStream === BOARD_STREAM.DECOR_MK ? DECOR_MK_BOARD_LISTS : BRANDING_BOARD_LISTS;
  return LINE_ITEM_LIST_ACTIONS.filter((action) => allowedLists.has(action.list));
}
