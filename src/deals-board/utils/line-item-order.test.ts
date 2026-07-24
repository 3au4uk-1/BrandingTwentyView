import { describe, expect, it } from 'vitest';

import {
  moveItemInOrder,
  nextPoryadok,
  planPoryadokPatches,
  sortLineItemsByOrder,
} from './line-item-order';

describe('line-item-order', () => {
  it('sorts by poryadok then id', () => {
    const sorted = sortLineItemsByOrder([
      { id: 'b', opportunityId: 'd', name: 'B', poryadok: 2 },
      { id: 'a', opportunityId: 'd', name: 'A', poryadok: 1 },
      { id: 'c', opportunityId: 'd', name: 'C' },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['a', 'b', 'c']);
  });

  it('plans contiguous patches after reorder', () => {
    const itemsById = new Map([
      ['a', { id: 'a', opportunityId: 'd', name: 'A', poryadok: 0 }],
      ['b', { id: 'b', opportunityId: 'd', name: 'B', poryadok: 1 }],
      ['c', { id: 'c', opportunityId: 'd', name: 'C', poryadok: 2 }],
    ]);
    const moved = moveItemInOrder(['a', 'b', 'c'], 'c', 'a');
    expect(moved).toEqual(['c', 'a', 'b']);
    expect(planPoryadokPatches(moved!, itemsById)).toEqual([
      { id: 'c', data: { poryadok: 0 } },
      { id: 'a', data: { poryadok: 1 } },
      { id: 'b', data: { poryadok: 2 } },
    ]);
  });

  it('computes next poryadok', () => {
    expect(nextPoryadok([{ id: 'a', opportunityId: 'd', name: 'A', poryadok: 3 }])).toBe(4);
    expect(nextPoryadok([])).toBe(0);
  });
});
