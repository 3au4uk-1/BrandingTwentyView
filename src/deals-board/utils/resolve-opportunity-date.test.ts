import { describe, expect, it } from 'vitest';

import {
  getOpportunityEffectiveDate,
  opportunityMatchesDateFilter,
} from './resolve-opportunity-date';

describe('getOpportunityEffectiveDate', () => {
  it('prefers loadDate when present', () => {
    expect(
      getOpportunityEffectiveDate({
        loadDate: '2026-06-28T10:00:00.000Z',
        closeDate: '2026-06-30T10:00:00.000Z',
      }),
    ).toBe('2026-06-28T10:00:00.000Z');
  });

  it('falls back to closeDate when loadDate is empty', () => {
    expect(
      getOpportunityEffectiveDate({
        loadDate: undefined,
        closeDate: '2026-06-30T10:00:00.000Z',
      }),
    ).toBe('2026-06-30T10:00:00.000Z');
  });
});

describe('opportunityMatchesDateFilter', () => {
  it('matches by closeDate when loadDate is missing', () => {
    expect(
      opportunityMatchesDateFilter(
        {
          loadDate: undefined,
          closeDate: '2026-06-27T15:00:00.000Z',
        },
        {
          dateFrom: '2026-06-27',
          dateTo: '2026-06-27',
        },
      ),
    ).toBe(true);
  });

  it('uses loadDate when both dates are present', () => {
    expect(
      opportunityMatchesDateFilter(
        {
          loadDate: '2026-06-28T10:00:00.000Z',
          closeDate: '2026-06-27T15:00:00.000Z',
        },
        {
          dateFrom: '2026-06-27',
          dateTo: '2026-06-27',
        },
      ),
    ).toBe(false);
  });
});
