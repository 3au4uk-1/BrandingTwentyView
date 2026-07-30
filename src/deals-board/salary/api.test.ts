import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../api/opportunity-link-fields-rest', () => ({
  enrichOpportunityRowsWithRestFields: vi.fn(),
}));

import { enrichOpportunityRowsWithRestFields } from '../api/opportunity-link-fields-rest';
import { fetchOpportunitiesByIdsForSalary } from './api';

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
