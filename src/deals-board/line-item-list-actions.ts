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
];
