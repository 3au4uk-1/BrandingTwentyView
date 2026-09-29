import { describe, expect, it } from 'vitest';
import { buildBannerCalendar, type BannerDealInput } from './calendar-layout';

const deal = (patch: Partial<BannerDealInput>): BannerDealInput => ({
  id: 'opp-1',
  name: 'Заказ А',
  stage: 'NOVYY',
  address: 'Тверская 1',
  loadDate: '2026-09-08T06:00:00.000Z',
  positionNames: ['Баннер 3x6'],
  slots: [],
  ...patch,
});

const cardOn = (date: string) => {
  const model = buildBannerCalendar([
    deal({
      slots: [
        {
          supplierId: 'sup-1',
          supplierName: 'Юра',
          startsAt: '2026-09-07T07:00:00.000Z',
          endsAt: '2026-09-09T15:00:00.000Z',
        },
      ],
    }),
  ]);
  return model.cardsByDate[date]?.[0];
};

describe('buildBannerCalendar', () => {
  it('places a multi-day slot on every Moscow day with the spec time labels', () => {
    expect(cardOn('2026-09-07')?.timeLabel).toBe('с 10:00');
    expect(cardOn('2026-09-08')?.timeLabel).toBe('весь день');
    expect(cardOn('2026-09-09')?.timeLabel).toBe('до 18:00');
    expect(cardOn('2026-09-07')?.assignees).toEqual(['Юра']);
    expect(cardOn('2026-09-07')?.closed).toBe(true);
    expect(cardOn('2026-09-06')).toBeUndefined();
  });

  it('collapses several slots on one day and lets весь день win', () => {
    const model = buildBannerCalendar([
      deal({
        slots: [
          {
            supplierId: 'sup-1',
            supplierName: 'Юра',
            startsAt: '2026-09-08T07:00:00.000Z',
            endsAt: '2026-09-08T09:00:00.000Z',
          },
          {
            supplierId: 'sup-2',
            supplierName: 'Мага',
            startsAt: '2026-09-08T12:00:00.000Z',
            endsAt: '2026-09-08T13:00:00.000Z',
          },
          {
            supplierId: 'sup-3',
            supplierName: 'Оля',
            startsAt: '2026-09-07T07:00:00.000Z',
            endsAt: '2026-09-09T15:00:00.000Z',
          },
        ],
      }),
    ]);
    const card = model.cardsByDate['2026-09-08']?.[0];
    expect(model.cardsByDate['2026-09-08']).toHaveLength(1);
    expect(card?.timeLabel).toBe('весь день');
    expect(card?.assignees).toEqual(['Мага', 'Оля', 'Юра']);
  });

  it('puts an undated assignee on the load date without a second card', () => {
    const model = buildBannerCalendar([
      deal({
        slots: [
          {
            supplierId: 'sup-1',
            supplierName: 'Юра',
            startsAt: '2026-09-08T07:00:00.000Z',
            endsAt: '2026-09-08T10:00:00.000Z',
          },
          {
            supplierId: 'sup-2',
            supplierName: 'Мага',
            startsAt: null,
            endsAt: null,
          },
        ],
      }),
    ]);
    expect(model.cardsByDate['2026-09-08']).toHaveLength(1);
    expect(model.cardsByDate['2026-09-08']?.[0]?.assignees).toEqual(['Мага', 'Юра']);
    expect(model.cardsByDate['2026-09-08']?.[0]?.timeLabel).toBe('10:00–13:00');
    expect(model.undated).toEqual([]);
  });

  it('uses load time when the only slots are undated', () => {
    const model = buildBannerCalendar([
      deal({
        slots: [
          {
            supplierId: 'sup-2',
            supplierName: 'Мага',
            startsAt: '2026-09-08T10:00:00.000Z',
            endsAt: '2026-09-08T07:00:00.000Z',
          },
        ],
      }),
    ]);
    expect(model.cardsByDate['2026-09-08']?.[0]?.timeLabel).toBe('09:00');
    expect(model.cardsByDate['2026-09-08']?.[0]?.assignees).toEqual(['Мага']);
  });

  it('shows an open deal on the load date when nobody is assigned', () => {
    const model = buildBannerCalendar([deal({ slots: [], address: '' })]);
    const card = model.cardsByDate['2026-09-08']?.[0];
    expect(card?.assignees).toEqual([]);
    expect(card?.closed).toBe(false);
    expect(card?.address).toBe('');
    expect(card?.timeLabel).toBe('09:00');
    expect(card?.positionNames).toEqual(['Баннер 3x6']);
  });

  it('puts a deal with no dates into the undated strip', () => {
    const model = buildBannerCalendar([
      deal({
        loadDate: null,
        slots: [
          { supplierId: 'sup-1', supplierName: 'Юра', startsAt: null, endsAt: null },
        ],
      }),
    ]);
    expect(model.cardsByDate).toEqual({});
    expect(model.undated).toEqual([
      expect.objectContaining({
        dealId: 'opp-1',
        timeLabel: '',
        assignees: ['Юра'],
        closed: true,
      }),
    ]);
  });

  it('keeps dated cards and parks undated people in the strip when loadDate is missing', () => {
    const model = buildBannerCalendar([
      deal({
        loadDate: null,
        slots: [
          {
            supplierId: 'sup-1',
            supplierName: 'Юра',
            startsAt: '2026-09-08T07:00:00.000Z',
            endsAt: '2026-09-08T10:00:00.000Z',
          },
          { supplierId: 'sup-2', supplierName: 'Мага', startsAt: null, endsAt: null },
        ],
      }),
    ]);
    expect(model.cardsByDate['2026-09-08']?.[0]?.assignees).toEqual(['Юра']);
    expect(model.undated.map((card) => card.assignees)).toEqual([['Мага']]);
  });

  it('drops cancelled deals', () => {
    const model = buildBannerCalendar([deal({ stage: 'OTMENA' })]);
    expect(model.cardsByDate).toEqual({});
    expect(model.undated).toEqual([]);
  });

  it('puts a banner deal with no slots and no load date into the undated strip', () => {
    const model = buildBannerCalendar([deal({ loadDate: null, slots: [], address: '' })]);
    expect(model.cardsByDate).toEqual({});
    expect(model.undated).toEqual([
      expect.objectContaining({
        dealId: 'opp-1',
        assignees: [],
        closed: false,
        timeLabel: '',
        address: '',
      }),
    ]);
  });
});
