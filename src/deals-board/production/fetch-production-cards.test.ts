import { describe, expect, it, vi } from 'vitest';
import { RestApiClient } from 'twenty-client-sdk/rest';

import {
  assembleProductionCards,
  fetchProductionLineRecords,
  fetchProductionOpportunities,
  normalizeProductionLine,
  normalizeProductionOpportunity,
} from './fetch-production-cards';

vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: vi.fn(),
}));

describe('production card assembly', () => {
  it('keeps a line when the deal is missing and ignores deal stage', () => {
    expect(normalizeProductionLine({
      id: 'line-1',
      name: 'Стойка',
      opportunityId: 'opp-1',
      dataGotovnostiProizvodstva: '2026-09-02',
      vremyaGotovnostiProizvodstva: '10:00',
      kommentariyDlyaProizvodstva: 'срочно',
      vzatoVRabotuProizvodstva: true,
      gotovoProizvodstva: false,
    })).toEqual({
      id: 'line-1',
      name: 'Стойка',
      opportunityId: 'opp-1',
      date: '2026-09-02',
      time: '10:00',
      comment: 'срочно',
      vzato: true,
      gotovo: false,
      files: [],
    });
    expect(normalizeProductionLine({ name: 'без id' })).toBeNull();
    expect(normalizeProductionOpportunity({ id: 'opp-1', name: 'Альфа', stage: 'OTMENA' })).toEqual({
      id: 'opp-1',
      name: 'Альфа',
    });

    const cards = assembleProductionCards(
      [
        {
          id: 'line-1',
          name: 'Стойка',
          opportunityId: 'opp-1',
          date: null,
          time: null,
          comment: '',
          vzato: false,
          gotovo: false,
          files: [],
        },
        {
          id: 'line-2',
          name: 'Ролл-ап',
          opportunityId: null,
          date: null,
          time: null,
          comment: '',
          vzato: false,
          gotovo: false,
          files: [],
        },
      ],
      [{ id: 'other', name: 'Чужая' }],
    );
    expect(cards.map((card) => card.dealName)).toEqual(['', '']);
    expect(cards).toHaveLength(2);
  });
});

const page = (start: number, count: number) => ({
  data: {
    dealLineItems: Array.from({ length: count }, (_, index) => {
      const n = start + index;
      return {
        id: `id-${String(n).padStart(4, '0')}`,
        name: `Позиция ${n}`,
        opportunityId: `opp-${n}`,
        vProizvodstvo: true,
        vzatoVRabotuProizvodstva: false,
        gotovoProizvodstva: false,
      };
    }),
  },
  pageInfo: { hasNextPage: true, endCursor: 'stuck-cursor' },
});

describe('fetchProductionLineRecords', () => {
  it('pages by id because a filtered cursor does not advance', async () => {
    const get = vi.fn()
      .mockResolvedValueOnce(page(0, 200))
      .mockResolvedValueOnce(page(200, 2));
    vi.mocked(RestApiClient).mockImplementation(() => ({ get }) as unknown as RestApiClient);

    const lines = await fetchProductionLineRecords();

    expect(lines).toHaveLength(202);
    expect(get).toHaveBeenCalledTimes(2);
    expect(get).toHaveBeenNthCalledWith(1, '/rest/dealLineItems', {
      query: { limit: 200, filter: 'vProizvodstvo[eq]:true' },
    });
    expect(get).toHaveBeenNthCalledWith(2, '/rest/dealLineItems', {
      query: {
        limit: 200,
        filter: 'and(vProizvodstvo[eq]:true,id[gt]:"id-0199")',
      },
    });
    expect(JSON.stringify(get.mock.calls)).not.toContain('after');
    expect(JSON.stringify(get.mock.calls)).not.toContain('OTMENA');
  });

  it('stops when the next id page repeats the same rows', async () => {
    const get = vi.fn().mockResolvedValue(page(0, 200));
    vi.mocked(RestApiClient).mockImplementation(() => ({ get }) as unknown as RestApiClient);

    const lines = await fetchProductionLineRecords();

    expect(lines).toHaveLength(200);
    expect(get).toHaveBeenCalledTimes(2);
  });
});

describe('fetchProductionOpportunities', () => {
  it('asks for names by id and does not filter stage', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { opportunities: [{ id: 'opp-1', name: 'Альфа', stage: 'OTMENA' }] },
      pageInfo: { hasNextPage: false },
    });
    vi.mocked(RestApiClient).mockImplementation(() => ({ get }) as unknown as RestApiClient);

    const deals = await fetchProductionOpportunities(['opp-1']);

    expect(deals).toEqual([{ id: 'opp-1', name: 'Альфа' }]);
    expect(get).toHaveBeenCalledWith('/rest/opportunities', {
      query: { limit: 1, filter: 'id[in]:["opp-1"]' },
    });
  });
});
