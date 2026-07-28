import { describe, expect, it } from 'vitest';

import {
  moveItemInOrder,
  nextPoryadok,
  planPoryadokPatches,
  planStageBandPoryadokPatches,
  sortLineItemsByOrder,
  sortLineItemsByStageBands,
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

  it('sorts by stage bands: new → mid → done → cancel', () => {
    const sorted = sortLineItemsByStageBands([
      { id: 'cancel', opportunityId: 'd', name: 'C', stage: 'OTMENA', poryadok: 0 },
      { id: 'done', opportunityId: 'd', name: 'D', stage: 'GOTOVO', poryadok: 1 },
      { id: 'work', opportunityId: 'd', name: 'W', stage: 'V_RABOTE', poryadok: 2 },
      { id: 'new', opportunityId: 'd', name: 'N', stage: 'NOVYY', poryadok: 3 },
      { id: 'print', opportunityId: 'd', name: 'P', stage: 'V_PECHATI', poryadok: 4 },
    ]);
    expect(sorted.map((item) => item.id)).toEqual([
      'new',
      'print',
      'work',
      'done',
      'cancel',
    ]);
  });

  it('preserves relative order within the same band', () => {
    const sorted = sortLineItemsByStageBands([
      { id: 'b', opportunityId: 'd', name: 'B', stage: 'NOVYY', poryadok: 5 },
      { id: 'a', opportunityId: 'd', name: 'A', stage: 'NOVYY', poryadok: 2 },
    ]);
    expect(sorted.map((item) => item.id)).toEqual(['a', 'b']);
  });

  it('plans poryadok patches after projecting a stage change', () => {
    const siblings = [
      { id: 'cancel', opportunityId: 'd', name: 'C', stage: 'OTMENA', poryadok: 0 },
      { id: 'work', opportunityId: 'd', name: 'W', stage: 'V_RABOTE', poryadok: 1 },
      { id: 'new', opportunityId: 'd', name: 'N', stage: 'NOVYY', poryadok: 2 },
    ];
    // work → NOVYY: within NOVYY keep prior poryadok (work=1 before new=2), then OTMENA
    expect(planStageBandPoryadokPatches(siblings, 'work', 'NOVYY')).toEqual([
      { id: 'work', data: { poryadok: 0 } },
      { id: 'new', data: { poryadok: 1 } },
      { id: 'cancel', data: { poryadok: 2 } },
    ]);
  });
});
