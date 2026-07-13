import { DEFAULT_MANUAL_LINE_ITEM_NAME } from 'src/constants/line-item-origin';

import type { LineItemRow } from '../types';

export type ManualLineItemSyncSnapshot = {
  name: string;
  kolichestvo: number;
  amountMicros: number;
};

export type ManualLineItemSyncPayload = {
  opportunityId: string;
  name: string;
  kolichestvo?: number;
  amountMicros: number;
  currencyCode: string;
};

export const isMeaningfulManualLineItemChange = (
  baseline: ManualLineItemSyncSnapshot,
  current: ManualLineItemSyncSnapshot,
): boolean => {
  if (current.name !== DEFAULT_MANUAL_LINE_ITEM_NAME) return true;
  if (current.amountMicros > 0) return true;
  if (current.kolichestvo !== baseline.kolichestvo) return true;
  return false;
};

export const buildManualLineItemSyncPayload = (
  lineItem: LineItemRow,
): ManualLineItemSyncPayload => ({
  opportunityId: lineItem.opportunityId,
  name: lineItem.name,
  kolichestvo: lineItem.kolichestvo,
  amountMicros: lineItem.amount?.amountMicros ?? 0,
  currencyCode: lineItem.amount?.currencyCode ?? 'RUB',
});
