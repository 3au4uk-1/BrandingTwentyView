import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('twenty-client-sdk/rest', () => ({
  RestApiClient: vi.fn(),
}));

import { RestApiClient } from 'twenty-client-sdk/rest';

import {
  buildSharesFilter,
  deleteShare,
  deleteShares,
  fetchSharesForOpportunities,
  normalizeShare,
  upsertShare,
} from './shares-api';

describe('normalizeShare', () => {
  it('maps a flat REST record', () => {
    expect(
      normalizeShare({
        id: 'share-1',
        opportunityId: 'opp-1',
        salaryEntryId: 'entry-1',
        amountRub: 667,
      }),
    ).toEqual({
      id: 'share-1',
      opportunityId: 'opp-1',
      salaryEntryId: 'entry-1',
      amountRub: 667,
    });
  });

  it('accepts nested relation ids', () => {
    expect(
      normalizeShare({
        id: 'share-2',
        opportunity: { id: 'opp-2' },
        salaryEntry: { id: 'entry-2' },
        amountRub: 100,
      }),
    ).toEqual({
      id: 'share-2',
      opportunityId: 'opp-2',
      salaryEntryId: 'entry-2',
      amountRub: 100,
    });
  });

  it('returns null when required ids are missing', () => {
    expect(normalizeShare({ id: 'share-3', amountRub: 10 })).toBeNull();
  });
});

describe('buildSharesFilter', () => {
  it('filters by opportunityId chunk', () => {
    expect(buildSharesFilter(['opp-1', 'opp-2'])).toBe(
      'opportunityId[in]:["opp-1","opp-2"]',
    );
  });
});

describe('fetchSharesForOpportunities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns [] without REST when no opportunity ids', async () => {
    const get = vi.fn();
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          get,
        }) as unknown as RestApiClient,
    );

    await expect(fetchSharesForOpportunities([])).resolves.toEqual([]);
    expect(get).not.toHaveBeenCalled();
  });

  it('chunks opportunity ids by 50', async () => {
    const opportunityIds = Array.from({ length: 51 }, (_, index) => `opp-${index + 1}`);
    const get = vi.fn().mockResolvedValue({
      data: { okleykaDealShares: [] },
    });
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          get,
        }) as unknown as RestApiClient,
    );

    await fetchSharesForOpportunities(opportunityIds);

    expect(get).toHaveBeenCalledTimes(2);
    const filters = get.mock.calls.map((call) => call[1]?.query?.filter as string);
    expect(filters[0]).toContain('opp-1');
    expect(filters[0]).toContain('opp-50');
    expect(filters[0]).not.toContain('opp-51');
    expect(filters[1]).toContain('opp-51');
  });

  it('normalizes list responses', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        okleykaDealShares: [
          { id: 'share-1', opportunityId: 'opp-1', salaryEntryId: 'entry-1', amountRub: 500 },
        ],
      },
    });
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          get,
        }) as unknown as RestApiClient,
    );

    await expect(fetchSharesForOpportunities(['opp-1'])).resolves.toEqual([
      {
        id: 'share-1',
        opportunityId: 'opp-1',
        salaryEntryId: 'entry-1',
        amountRub: 500,
      },
    ]);
  });
});

describe('upsertShare', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts when existingId is absent', async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const patch = vi.fn();
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          post,
          patch,
        }) as unknown as RestApiClient,
    );

    await upsertShare({
      opportunityId: 'opp-1',
      salaryEntryId: 'entry-1',
      amountRub: 667,
    });

    expect(post).toHaveBeenCalledWith('/rest/okleykaDealShares', {
      opportunityId: 'opp-1',
      salaryEntryId: 'entry-1',
      amountRub: 667,
    });
    expect(patch).not.toHaveBeenCalled();
  });

  it('patches when existingId is provided', async () => {
    const post = vi.fn();
    const patch = vi.fn().mockResolvedValue(undefined);
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          post,
          patch,
        }) as unknown as RestApiClient,
    );

    await upsertShare({
      opportunityId: 'opp-1',
      salaryEntryId: 'entry-1',
      amountRub: 700,
      existingId: 'share-1',
    });

    expect(patch).toHaveBeenCalledWith('/rest/okleykaDealShares/share-1', {
      opportunityId: 'opp-1',
      salaryEntryId: 'entry-1',
      amountRub: 700,
    });
    expect(post).not.toHaveBeenCalled();
  });
});

describe('deleteShare', () => {
  it('deletes by id', async () => {
    const del = vi.fn().mockResolvedValue(undefined);
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          delete: del,
        }) as unknown as RestApiClient,
    );

    await deleteShare('share-1');

    expect(del).toHaveBeenCalledWith('/rest/okleykaDealShares/share-1');
  });
});

describe('deleteShares', () => {
  it('deletes each id', async () => {
    const del = vi.fn().mockResolvedValue(undefined);
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          delete: del,
        }) as unknown as RestApiClient,
    );

    await deleteShares(['share-1', 'share-2']);

    expect(del).toHaveBeenCalledTimes(2);
    expect(del).toHaveBeenCalledWith('/rest/okleykaDealShares/share-1');
    expect(del).toHaveBeenCalledWith('/rest/okleykaDealShares/share-2');
  });

  it('no-ops for empty list', async () => {
    const del = vi.fn();
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          delete: del,
        }) as unknown as RestApiClient,
    );

    await deleteShares([]);
    expect(del).not.toHaveBeenCalled();
  });

  it('throws when any delete fails', async () => {
    const del = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('boom'));
    vi.mocked(RestApiClient).mockImplementation(
      () =>
        ({
          delete: del,
        }) as unknown as RestApiClient,
    );

    await expect(deleteShares(['share-1', 'share-2'])).rejects.toThrow(
      'Не удалось удалить часть долей оклейки',
    );
  });
});
