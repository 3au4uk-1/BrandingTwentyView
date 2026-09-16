import { describe, expect, it } from 'vitest';

import {
  CHILD_SMETA_NODE_SELECTION,
  CHILD_SMETA_REST_LINK_FIELDS,
} from './deals-board-page-opportunity-selection';

describe('CHILD_SMETA_NODE_SELECTION', () => {
  it('does not request workspace link fields over Core GraphQL', () => {
    expect(CHILD_SMETA_NODE_SELECTION).toEqual({
      id: true,
      name: true,
      parentOpportunityId: true,
    });
    expect(CHILD_SMETA_NODE_SELECTION).not.toHaveProperty('tonyLink');
    expect(CHILD_SMETA_NODE_SELECTION).not.toHaveProperty('bitrixLink');
  });

  it('loads Tony/Bitrix links via REST field names', () => {
    expect(CHILD_SMETA_REST_LINK_FIELDS).toEqual(['tonyLink', 'bitrixLink']);
  });
});
