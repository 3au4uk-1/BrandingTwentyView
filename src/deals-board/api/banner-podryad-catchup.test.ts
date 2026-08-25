import { QueryClient } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { LineItemRow } from '../types';

vi.mock('./crmparser', async () => {
  const actual = await vi.importActual<typeof import('./crmparser')>('./crmparser');
  return {
    ...actual,
    notifyBannerPodryadCatchup: vi.fn().mockResolvedValue({ ok: true, queued: true }),
  };
});

import { notifyBannerPodryadCatchup } from './crmparser';
import { fireBannerPodryadCatchupNotify } from './banner-podryad-catchup';

describe('fireBannerPodryadCatchupNotify', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('includes opportunityId and loadDate from cache', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData<LineItemRow[]>(['lineItems', 'opp-9'], [
      { id: 'li-9', opportunityId: 'opp-9', name: 'Banner' },
    ]);
    queryClient.setQueryData(['deals-board-page', 'v'], {
      records: [{ id: 'opp-9', name: 'Deal', loadDate: '2026-08-25' }],
      totalCount: 1,
    });

    fireBannerPodryadCatchupNotify(queryClient, 'li-9');

    expect(notifyBannerPodryadCatchup).toHaveBeenCalledWith({
      lineItemId: 'li-9',
      opportunityId: 'opp-9',
      loadDate: '2026-08-25',
    });
  });

  it('omits loadDate when opportunity is not in cache', () => {
    const queryClient = new QueryClient();
    fireBannerPodryadCatchupNotify(queryClient, 'li-missing');

    expect(notifyBannerPodryadCatchup).toHaveBeenCalledWith({
      lineItemId: 'li-missing',
    });
  });
});
