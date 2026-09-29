import { describe, expect, it } from 'vitest';
import { normalizeBannerLine, normalizeBannerOpportunity } from './fetch-banner-deals';

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
