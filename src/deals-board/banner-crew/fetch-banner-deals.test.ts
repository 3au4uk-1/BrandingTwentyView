import { describe, expect, it, vi } from 'vitest';
import { RestApiClient } from 'twenty-client-sdk/rest';

import { fetchBannerLineRecords, normalizeBannerLine, normalizeBannerOpportunity } from './fetch-banner-deals';

vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: vi.fn(),
}));

describe('banner deal normalizers', () => {
  it('reads opportunity address and banner lines', () => {
    expect(normalizeBannerOpportunity({
      id: 'opp-1',
      name: 'Заказ А',
      stage: 'NOVYY',
      clientAddress: 'Тверская 1',
      loadDate: '2026-09-08T06:00:00.000Z',
    })).toEqual({
      id: 'opp-1',
      name: 'Заказ А',
      stage: 'NOVYY',
      address: 'Тверская 1',
      loadDate: '2026-09-08T06:00:00.000Z',
    });
    expect(normalizeBannerLine({
      opportunityId: 'opp-1',
      name: 'Баннер 3x6',
      tip: 'BANNERA',
    })).toEqual({ opportunityId: 'opp-1', name: 'Баннер 3x6', tip: 'BANNERA' });
    expect(normalizeBannerOpportunity({ name: 'нет id' })).toBeNull();
    expect(normalizeBannerLine({ name: 'Баннер', tip: 'BANNERA' })).toBeNull();
  });
});

const bannerPage = (start: number, count: number) => ({
  data: {
    dealLineItems: Array.from({ length: count }, (_, index) => {
      const n = start + index;
      return {
        id: `id-${String(n).padStart(4, '0')}`,
        opportunityId: `opp-${n}`,
        name: `Баннер ${n}`,
        tip: 'BANNERA',
      };
    }),
  },
  pageInfo: { hasNextPage: true, endCursor: 'stuck-cursor' },
});

describe('fetchBannerLineRecords', () => {
  it('pages by id because a filtered cursor does not advance', async () => {
    const get = vi.fn()
      .mockResolvedValueOnce(bannerPage(0, 200))
      .mockResolvedValueOnce(bannerPage(200, 2));
    vi.mocked(RestApiClient).mockImplementation(() => ({ get }) as unknown as RestApiClient);

    const lines = await fetchBannerLineRecords();

    expect(lines).toHaveLength(202);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenNthCalledWith(1, '/rest/dealLineItems', {
      query: { limit: 200, filter: 'tip[in]:["BANNERA"]' },
    });
    expect(get).toHaveBeenNthCalledWith(2, '/rest/dealLineItems', {
      query: { limit: 200, filter: 'and(tip[in]:["BANNERA"],id[gt]:"id-0199")' },
    });
  });

  it('stops when the next id page repeats the same rows', async () => {
    const get = vi.fn().mockResolvedValue(bannerPage(0, 200));
    vi.mocked(RestApiClient).mockImplementation(() => ({ get }) as unknown as RestApiClient);

    const lines = await fetchBannerLineRecords();

    expect(lines).toHaveLength(200);
    expect(get).toHaveBeenCalledTimes(2);
  });
});
