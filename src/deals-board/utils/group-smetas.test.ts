import { describe, expect, it } from 'vitest';

import type { LineItemRow, OpportunityRow } from '../types';
import { groupSmetasForParent } from './group-smetas';

describe('groupSmetasForParent', () => {
  const children: OpportunityRow[] = [
    { id: 'child-a', name: 'Смета A', parentOpportunityId: 'parent-1' },
    { id: 'child-b', name: 'Смета B', parentOpportunityId: 'parent-1' },
    { id: 'child-other', name: 'Other', parentOpportunityId: 'parent-2' },
  ];

  const lineItems: LineItemRow[] = [
    { id: 'li-a1', opportunityId: 'child-a', name: 'Позиция A1' },
    { id: 'li-b1', opportunityId: 'child-b', name: 'Позиция B1' },
    { id: 'li-other', opportunityId: 'child-other', name: 'Other' },
  ];

  it('attaches only children of the parent with their line items', () => {
    expect(groupSmetasForParent('parent-1', children, lineItems)).toEqual([
      {
        id: 'child-a',
        name: 'Смета A',
        parentOpportunityId: 'parent-1',
        lineItems: [lineItems[0]],
      },
      {
        id: 'child-b',
        name: 'Смета B',
        parentOpportunityId: 'parent-1',
        lineItems: [lineItems[1]],
      },
    ]);
  });

  it('returns empty when parent has no children', () => {
    expect(groupSmetasForParent('parent-missing', children, lineItems)).toEqual([]);
  });
});
