import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: vi.fn(),
}));

vi.mock('../api/opportunities', () => ({
  fetchOpportunities: vi.fn(),
  patchOpportunity: vi.fn(),
}));

vi.mock('./compute', () => ({
  buildOkleykaDealGroups: vi.fn(),
}));

import { RestApiClient } from 'twenty-client-sdk/rest';

import { fetchOpportunities, patchOpportunity } from '../api/opportunities';
import { buildOkleykaDealGroups } from './compute';
import {
  buildOkleykaAllLineItemsFilter,
  buildOkleykaSalaryLineItemsFilter,
  fetchOkleykaSalaryFullPageData,
  fetchOkleykaSalaryPageData,
  patchOkleykaDealCost,
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

describe('buildOkleykaAllLineItemsFilter', () => {
  it('filters only by opportunity ids', () => {
    const filter = buildOkleykaAllLineItemsFilter(['opp-1', 'opp-2']);
    expect(filter).toContain('opportunityId[in]:["opp-1","opp-2"]');
    expect(filter).not.toContain('PLENKA');
    expect(filter).not.toContain('NASHI');
    expect(filter).not.toContain('OKLEYKA');
  });
});

describe('fetchOkleykaSalaryFullPageData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns [] without REST when opportunityIds is empty', async () => {
    const get = vi.fn();
    vi.mocked(RestApiClient).mockImplementation(
      () => ({ get }) as unknown as RestApiClient,
    );
    await expect(
      fetchOkleykaSalaryFullPageData('2026-07-01', '2026-07-31', []),
    ).resolves.toEqual([]);
    expect(fetchOpportunities).not.toHaveBeenCalled();
    expect(get).not.toHaveBeenCalled();
  });

  it('loads unfiltered line items and extra rashod, then builds full groups', async () => {
    const get = vi.fn().mockResolvedValue({ data: [] });
    vi.mocked(RestApiClient).mockImplementation(
      () => ({ get }) as unknown as RestApiClient,
    );
    vi.mocked(fetchOpportunities).mockResolvedValue({
      records: [
        { id: 'opp-1', name: 'Deal', loadDate: '2026-07-10' },
        { id: 'opp-skip', name: 'Other', loadDate: '2026-07-10' },
      ],
      totalCount: 2,
    });
    vi.mocked(buildOkleykaDealGroups).mockReturnValue([]);

    await fetchOkleykaSalaryFullPageData('2026-07-01', '2026-07-31', ['opp-1']);

    expect(fetchOpportunities).toHaveBeenCalledWith(
      expect.objectContaining({
        restFieldNames: expect.arrayContaining([
          'rashodLogistika',
          'rashodBeznal',
          'rashodPechat',
          'rashodFrezerovka',
          'rashodOkleyka',
        ]),
      }),
    );
    const restNames = vi.mocked(fetchOpportunities).mock.calls[0]?.[0]?.restFieldNames as string[];
    expect(restNames).not.toContain('rashodVyezdnayaKomanda');
    expect(restNames).not.toContain('rashodItogo');
    expect(get.mock.calls[0]?.[1]?.query?.filter).toBe(
      buildOkleykaAllLineItemsFilter(['opp-1']),
    );
    expect(buildOkleykaDealGroups).toHaveBeenCalledWith(
      expect.any(Array),
      expect.any(Map),
      'full',
    );
    const dealsById = vi.mocked(buildOkleykaDealGroups).mock.calls[0]?.[1] as Map<string, { id: string }>;
    expect(dealsById.has('opp-1')).toBe(true);
    expect(dealsById.has('opp-skip')).toBe(false);
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
      restFieldNames: [
        'name',
        'bitrixLink',
        'loadDate',
        'closeDate',
        'rashodPechat',
        'rashodFrezerovka',
        'rashodOkleyka',
      ],
      includeCompanyRelation: false,
      fetchAll: true,
    });
    expect(get).not.toHaveBeenCalled();
    expect(buildOkleykaDealGroups).not.toHaveBeenCalled();
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
    vi.mocked(buildOkleykaDealGroups).mockReturnValue([]);

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

  it('builds deal groups from line items and date-filtered deals', async () => {
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
    vi.mocked(buildOkleykaDealGroups).mockReturnValue([
      {
        opportunityId: 'opp-1',
        dealName: 'Deal',
        bitrixUrl: 'https://bitrix.example/1',
        positions: [
          {
            lineItemId: 'li-1',
            opportunityId: 'opp-1',
            positionName: 'Pos',
            qty: 1,
            unitPriceRub: 0,
            saleRub: 0,
            tip: 'PLENKA',
            stage: 'OKLEYKA',
            tipDetail: 'NASHI',
            isQualifying: true,
            isCancelled: false,
          },
        ],
        saleRub: 0,
        qualifyingSaleRub: 0,
        printCostRub: 0,
        frezaCostRub: 0,
        logisticsCostRub: 0,
        beznalCostRub: 0,
        okleykaCostRub: null,
        costRub: 0,
        profitRub: 0,
        marginPct: null,
        okleykaSharePct: 100,
        eventDate: '2026-07-10',
      },
    ]);

    const groups = await fetchOkleykaSalaryPageData('2026-07-01', '2026-07-31');

    expect(groups).toHaveLength(1);
    expect(buildOkleykaDealGroups).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'li-1', opportunityId: 'opp-1' })],
      expect.any(Map),
    );
    const dealsById = vi.mocked(buildOkleykaDealGroups).mock.calls[0]?.[1] as Map<
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
    vi.mocked(buildOkleykaDealGroups).mockReturnValue([]);

    await fetchOkleykaSalaryPageData('2026-07-01', '2026-07-31');

    expect(buildOkleykaDealGroups).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'li-1', opportunityId: 'opp-1' })],
      expect.any(Map),
    );
  });
});

describe('patchOkleykaDealCost', () => {
  beforeEach(() => {
    vi.mocked(patchOpportunity).mockReset();
  });

  it('patchOkleykaDealCost writes currency micros for positive rubles', async () => {
    await patchOkleykaDealCost('opp-1', 1500);
    expect(patchOpportunity).toHaveBeenCalledWith('opp-1', {
      rashodOkleyka: { amountMicros: 1_500_000_000, currencyCode: 'RUB' },
    });
  });

  it('patchOkleykaDealCost clears with amountMicros null object', async () => {
    await patchOkleykaDealCost('opp-1', null);
    expect(patchOpportunity).toHaveBeenCalledWith('opp-1', {
      rashodOkleyka: { amountMicros: null, currencyCode: 'RUB' },
    });
  });
});

