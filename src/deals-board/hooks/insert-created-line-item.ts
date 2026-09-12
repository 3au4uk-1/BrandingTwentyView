import type { QueryClient } from '@tanstack/react-query';

import {
  DEFAULT_MANUAL_LINE_ITEM_NAME,
  LINE_ITEM_ORIGIN,
} from 'src/constants/line-item-origin';

import type { LineItemRow } from '../types';

/**
 * Aggregate cold path keeps `useLineItems` disabled and only hydrates from
 * `deals-board-page`. Invalidating `lineItems` alone does not refetch.
 */
export const invalidateDealsBoardLineItemQueries = (
  queryClient: QueryClient,
): Promise<void> =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: ['lineItems'] }),
    queryClient.invalidateQueries({ queryKey: ['deals-board-page'] }),
  ]).then(() => undefined);

export const buildCreatedManualLineItem = (
  lineItemId: string,
  opportunityId: string,
  poryadok: number,
): LineItemRow => ({
  id: lineItemId,
  opportunityId,
  name: DEFAULT_MANUAL_LINE_ITEM_NAME,
  kolichestvo: 1,
  poryadok,
  amount: { amountMicros: 0, currencyCode: 'RUB' },
  istochnik: LINE_ITEM_ORIGIN.TWENTY_MANUAL,
  stage: 'NOVYY',
});

export const insertCreatedLineItemInCache = (
  queryClient: QueryClient,
  lineItem: LineItemRow,
): void => {
  for (const [queryKey, items] of queryClient.getQueriesData<LineItemRow[]>({
    queryKey: ['lineItems'],
  })) {
    if (!items) continue;
    if (items.some((item) => item.id === lineItem.id)) continue;

    const ids = queryKey[1];
    const keyHasOpp = Array.isArray(ids) && ids.includes(lineItem.opportunityId);
    const hasSibling = items.some((item) => item.opportunityId === lineItem.opportunityId);
    if (!keyHasOpp && !hasSibling) continue;

    queryClient.setQueryData<LineItemRow[]>(queryKey, [...items, lineItem]);
  }
};
