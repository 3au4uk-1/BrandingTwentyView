import { describe, expect, it } from 'vitest';
import { assembleBannerDeals } from './banner-deals';
import type { BannerCrewSlot } from './types';

const slot = (patch: Partial<BannerCrewSlot>): BannerCrewSlot => ({
  id: 's1',
  opportunityId: 'opp-1',
  opportunityName: 'Заказ А',
  opportunityStage: 'NOVYY',
  supplierId: 'sup-1',
  supplierName: 'Юра',
  location: 'SITE',
  startsAt: null,
  endsAt: null,
  ...patch,
});

describe('assembleBannerDeals', () => {
  it('keeps banner deals, trims address, and ignores other tips and other deals slots', () => {
    const deals = assembleBannerDeals(
      [
        {
          id: 'opp-1',
          name: 'Заказ А',
          stage: 'NOVYY',
          address: '  Тверская 1 ',
          loadDate: '2026-09-08T06:00:00.000Z',
        },
        {
          id: 'opp-2',
          name: 'Без баннера',
          stage: 'NOVYY',
          address: null,
          loadDate: null,
        },
      ],
      [
        { opportunityId: 'opp-1', name: 'Баннер 3x6', tip: 'BANNERA' },
        { opportunityId: 'opp-1', name: 'Баннер 3x6', tip: 'BANNERA' },
        { opportunityId: 'opp-1', name: 'Плёнка', tip: 'PLENKA' },
        { opportunityId: 'opp-1', name: '  ', tip: 'BANNERA' },
        { opportunityId: 'opp-2', name: 'Стойка', tip: 'PROIZVODSTVO' },
      ],
      [slot({}), slot({ id: 's2', opportunityId: 'opp-2', supplierName: 'Чужой' })],
    );
    expect(deals).toEqual([
      {
        id: 'opp-1',
        name: 'Заказ А',
        stage: 'NOVYY',
        address: 'Тверская 1',
        loadDate: '2026-09-08T06:00:00.000Z',
        positionNames: ['Баннер 3x6'],
        slots: [
          {
            supplierId: 'sup-1',
            supplierName: 'Юра',
            startsAt: null,
            endsAt: null,
          },
        ],
      },
    ]);
  });
});
