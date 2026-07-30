import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: vi.fn(),
}));

vi.mock('../api/opportunities', () => ({
  fetchOpportunities: vi.fn(),
}));

vi.mock('../api/line-items', () => ({
  updateLineItem: vi.fn(),
}));

vi.mock('../api/opportunity-link-fields-rest', () => ({
  enrichOpportunityRowsWithRestFields: vi.fn(),
}));

vi.mock('./compute', () => ({
  buildOkleykaSalaryRows: vi.fn(),
}));

import { RestApiClient } from 'twenty-client-sdk/rest';

import { fetchOpportunities } from '../api/opportunities';
import { updateLineItem } from '../api/line-items';
import { enrichOpportunityRowsWithRestFields } from '../api/opportunity-link-fields-rest';
import { buildOkleykaSalaryRows } from './compute';
import {
  buildOkleykaSalaryLineItemsFilter,
  fetchOkleykaSalaryPageData,
  fetchOpportunitiesByIdsForSalary,
  patchOkleykaCost,
} from './api';

describe('buildOkleykaSalaryLineItemsFilter', () => {
  it('includes tip, tipDetail, stage, and opportunityId chunk', () => {
    const filter = buildOkleykaSalaryLineItemsFilter(['opp-1', 'opp-2']);

    expect(filter).toContain('opportunityId[in]:["opp-1","opp-2"]');
    expect(filter).toContain('tip[eq]:"PLENKA"');
    expect(filter).toContain('tipDetail[eq]:"NASHI"');
    expect(filter).toContain('OKLEYKA');
    expect(filter).toContain('GOTOVO');
  });
});

describe('fetchOkleykaSalaryPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns [] without line-item REST when no opportunities', async () => {
    const get = vi.fn();
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          get,
        }) as unknown as RestApiClient,
    );
    vi.mocked(fetchOpportunities).mockResolvedValue({ records: [], totalCount: 0 });

    await expect(fetchOkleykaSalaryPageData('2026-07-01', '2026-07-31')).resolves.toEqual([]);

    expect(fetchOpportunities).toHaveBeenCalledWith({
      limit: 200,
      offset: 0,
      sort: [],
      filters: { datePreset: 'custom', dateFrom: '2026-07-01', dateTo: '2026-07-31' },
      visibleCrmFieldNames: ['loadDate'],
      restFieldNames: ['name', 'bitrixLink', 'loadDate', 'closeDate'],
      includeCompanyRelation: false,
      fetchAll: true,
    });
    expect(get).not.toHaveBeenCalled();
    expect(buildOkleykaSalaryRows).not.toHaveBeenCalled();
  });

  it('chunks opportunity ids by 50 for line-item fetches', async () => {
    const opportunityIds = Array.from({ length: 51 }, (_, index) => `opp-${index + 1}`);
    const get = vi.fn().mockResolvedValue({ data: [] });
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          get,
        }) as unknown as RestApiClient,
    );
    vi.mocked(fetchOpportunities).mockResolvedValue({
      records: opportunityIds.map((id) => ({
        id,
        name: id,
        loadDate: '2026-07-15',
      })),
      totalCount: 51,
    });
    vi.mocked(buildOkleykaSalaryRows).mockReturnValue([]);

    await fetchOkleykaSalaryPageData('2026-07-01', '2026-07-31');

    expect(get).toHaveBeenCalledTimes(2);
    const filters = get.mock.calls.map((call) => call[1]?.query?.filter as string);
    expect(filters[0]).toContain('opp-1');
    expect(filters[0]).toContain('opp-50');
    expect(filters[0]).not.toContain('opp-51');
    expect(filters[1]).toContain('opp-51');
    expect(filters[0]).toContain('tip[eq]:"PLENKA"');
    expect(filters[0]).toContain('tipDetail[eq]:"NASHI"');
    expect(filters[0]).toContain('OKLEYKA');
  });

  it('builds salary rows from line items and date-filtered deals', async () => {
    const lineItem = {
      id: 'li-1',
      name: 'Pos',
      opportunityId: 'opp-1',
      tip: 'PLENKA',
      tipDetail: 'NASHI',
      stage: 'OKLEYKA',
    };
    const get = vi.fn().mockResolvedValue({ data: [lineItem] });
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          get,
        }) as unknown as RestApiClient,
    );
    vi.mocked(fetchOpportunities).mockResolvedValue({
      records: [
        {
          id: 'opp-1',
          name: 'Deal',
          loadDate: '2026-07-10',
          bitrixLink: { primaryLinkUrl: 'https://bitrix.example/1' },
        },
      ],
      totalCount: 1,
    });
    vi.mocked(buildOkleykaSalaryRows).mockReturnValue([
      {
        lineItemId: 'li-1',
        opportunityId: 'opp-1',
        bitrixUrl: 'https://bitrix.example/1',
        dealName: 'Deal',
        positionName: 'Pos',
        qty: 1,
        saleRub: 0,
        printCostRub: 0,
        frezaCostRub: 0,
        okleykaCostRub: 0,
        costRub: 0,
        profitRub: 0,
        marginPct: null,
      },
    ]);

    const rows = await fetchOkleykaSalaryPageData('2026-07-01', '2026-07-31');

    expect(rows).toHaveLength(1);
    expect(buildOkleykaSalaryRows).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'li-1', opportunityId: 'opp-1' })],
      expect.any(Map),
    );
    const dealsById = vi.mocked(buildOkleykaSalaryRows).mock.calls[0]?.[1] as Map<
      string,
      { id: string; name: string }
    >;
    expect(dealsById.get('opp-1')?.name).toBe('Deal');
  });

  it('drops line items whose opportunity is not in date-filtered dealsById', async () => {
    const matchedLineItem = {
      id: 'li-1',
      name: 'Matched',
      opportunityId: 'opp-1',
      tip: 'PLENKA',
      tipDetail: 'NASHI',
      stage: 'OKLEYKA',
    };
    const orphanLineItem = {
      id: 'li-2',
      name: 'Orphan',
      opportunityId: 'opp-missing',
      tip: 'PLENKA',
      tipDetail: 'NASHI',
      stage: 'OKLEYKA',
    };
    const get = vi.fn().mockResolvedValue({ data: [matchedLineItem, orphanLineItem] });
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          get,
        }) as unknown as RestApiClient,
    );
    vi.mocked(fetchOpportunities).mockResolvedValue({
      records: [
        {
          id: 'opp-1',
          name: 'Deal',
          loadDate: '2026-07-10',
        },
      ],
      totalCount: 1,
    });
    vi.mocked(buildOkleykaSalaryRows).mockReturnValue([]);

    await fetchOkleykaSalaryPageData('2026-07-01', '2026-07-31');

    expect(buildOkleykaSalaryRows).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'li-1', opportunityId: 'opp-1' })],
      expect.any(Map),
    );
  });
});

describe('patchOkleykaCost', () => {
  beforeEach(() => {
    vi.mocked(updateLineItem).mockReset();
  });

  it('clears stoimostOkleyki when rubles is null', async () => {
    await patchOkleykaCost('li-1', null);

    expect(updateLineItem).toHaveBeenCalledWith('li-1', { stoimostOkleyki: null });
  });

  it('writes RUB micros when rubles is a number', async () => {
    await patchOkleykaCost('li-1', 123.45);

    expect(updateLineItem).toHaveBeenCalledWith('li-1', {
      stoimostOkleyki: {
        amountMicros: 123_450_000,
        currencyCode: 'RUB',
      },
    });
  });
});

describe('fetchOpportunitiesByIdsForSalary', () => {
  beforeEach(() => {
    vi.mocked(enrichOpportunityRowsWithRestFields).mockReset();
  });

  it('returns empty without calling REST when ids are empty', async () => {
    await expect(fetchOpportunitiesByIdsForSalary([])).resolves.toEqual([]);
    expect(enrichOpportunityRowsWithRestFields).not.toHaveBeenCalled();
  });

  it('loads name + bitrixLink via REST enrichment (not GraphQL)', async () => {
    vi.mocked(enrichOpportunityRowsWithRestFields).mockResolvedValue([
      {
        id: 'opp-1',
        name: 'Deal',
        bitrixLink: { primaryLinkUrl: 'https://bitrix.example/1' },
      },
    ]);

    const rows = await fetchOpportunitiesByIdsForSalary(['opp-1', 'opp-1']);

    expect(enrichOpportunityRowsWithRestFields).toHaveBeenCalledWith(
      [{ id: 'opp-1', name: '' }],
      ['name', 'bitrixLink'],
    );
    expect(rows[0]?.bitrixLink?.primaryLinkUrl).toBe('https://bitrix.example/1');
  });
});
