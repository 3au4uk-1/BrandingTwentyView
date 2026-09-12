import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import { DEFAULT_MANUAL_LINE_ITEM_NAME, LINE_ITEM_ORIGIN } from 'src/constants/line-item-origin';

import type { LineItemRow } from '../types';
import {
  buildCreatedManualLineItem,
  insertCreatedLineItemInCache,
  invalidateDealsBoardLineItemQueries,
} from './insert-created-line-item';
import { lineItemsQueryKey } from './useLineItems';

const sibling = (overrides: Partial<LineItemRow> = {}): LineItemRow => ({
  id: 'li-old',
  opportunityId: 'opp-1',
  name: 'Баннер',
  ...overrides,
});

describe('buildCreatedManualLineItem', () => {
  it('builds the default manual row the parser sync already assumes', () => {
    expect(buildCreatedManualLineItem('li-new', 'opp-1', 2)).toEqual({
      id: 'li-new',
      opportunityId: 'opp-1',
      name: DEFAULT_MANUAL_LINE_ITEM_NAME,
      kolichestvo: 1,
      poryadok: 2,
      amount: { amountMicros: 0, currencyCode: 'RUB' },
      istochnik: LINE_ITEM_ORIGIN.TWENTY_MANUAL,
      stage: 'NOVYY',
    });
  });
});

describe('insertCreatedLineItemInCache', () => {
  it('appends into caches that already list the deal', () => {
    const queryClient = new QueryClient();
    const queryKey = lineItemsQueryKey(['opp-1']);
    queryClient.setQueryData(queryKey, [sibling()]);

    insertCreatedLineItemInCache(
      queryClient,
      buildCreatedManualLineItem('li-new', 'opp-1', 1),
    );

    expect(queryClient.getQueryData<LineItemRow[]>(queryKey)?.map((item) => item.id)).toEqual([
      'li-old',
      'li-new',
    ]);
  });

  it('does not insert into a different deal cache', () => {
    const queryClient = new QueryClient();
    const queryKey = lineItemsQueryKey(['opp-2']);
    queryClient.setQueryData(queryKey, [sibling({ opportunityId: 'opp-2' })]);

    insertCreatedLineItemInCache(
      queryClient,
      buildCreatedManualLineItem('li-new', 'opp-1', 0),
    );

    expect(queryClient.getQueryData<LineItemRow[]>(queryKey)).toEqual([
      sibling({ opportunityId: 'opp-2' }),
    ]);
  });
});

describe('invalidateDealsBoardLineItemQueries', () => {
  it('invalidates both the live list and the aggregate page cache', async () => {
    const queryClient = new QueryClient();
    const spy = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);

    await invalidateDealsBoardLineItemQueries(queryClient);

    expect(spy).toHaveBeenCalledWith({ queryKey: ['lineItems'] });
    expect(spy).toHaveBeenCalledWith({ queryKey: ['deals-board-page'] });
  });
});
