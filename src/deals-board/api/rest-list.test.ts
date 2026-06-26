import { describe, expect, it } from 'vitest';

import { normalizeRestListResponse } from './rest-list';

type Item = { id: string };

describe('normalizeRestListResponse', () => {
  it('returns a flat data array', () => {
    const items: Item[] = [{ id: '1' }];
    expect(normalizeRestListResponse({ data: items }, 'dealLineItems')).toEqual(items);
  });

  it('returns nested collection array', () => {
    const items: Item[] = [{ id: '1' }, { id: '2' }];
    expect(
      normalizeRestListResponse(
        {
          data: { dealLineItems: items },
          pageInfo: { hasNextPage: false },
        },
        'dealLineItems',
      ),
    ).toEqual(items);
  });

  it('returns top-level collection array', () => {
    const items: Item[] = [{ id: '1' }];
    expect(normalizeRestListResponse({ dealLineItems: items }, 'dealLineItems')).toEqual(items);
  });

  it('returns bare array response', () => {
    const items: Item[] = [{ id: '1' }];
    expect(normalizeRestListResponse(items, 'dealLineItems')).toEqual(items);
  });

  it('returns empty array for invalid shapes', () => {
    expect(normalizeRestListResponse(null, 'dealLineItems')).toEqual([]);
    expect(normalizeRestListResponse({ data: { dealLineItems: 'bad' } }, 'dealLineItems')).toEqual([]);
    expect(normalizeRestListResponse({ data: {} }, 'dealLineItems')).toEqual([]);
  });
});
