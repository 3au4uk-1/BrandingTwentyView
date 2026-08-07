import { describe, expect, it } from 'vitest';

import { normalizeRestListResponse, resolveNextRestCursor } from './rest-list';

type Item = { id: string };

describe('resolveNextRestCursor', () => {
  it('returns endCursor when hasNextPage is true', () => {
    expect(
      resolveNextRestCursor(undefined, { hasNextPage: true, endCursor: 'c2' }),
    ).toBe('c2');
  });

  it('returns undefined when hasNextPage is false', () => {
    expect(
      resolveNextRestCursor('c1', { hasNextPage: false, endCursor: 'c2' }),
    ).toBeUndefined();
  });

  it('returns undefined when endCursor is missing', () => {
    expect(resolveNextRestCursor('c1', { hasNextPage: true })).toBeUndefined();
    expect(
      resolveNextRestCursor('c1', { hasNextPage: true, endCursor: null }),
    ).toBeUndefined();
  });

  it('returns undefined when endCursor did not advance (stuck pagination)', () => {
    expect(
      resolveNextRestCursor('c1', { hasNextPage: true, endCursor: 'c1' }),
    ).toBeUndefined();
  });
});

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
