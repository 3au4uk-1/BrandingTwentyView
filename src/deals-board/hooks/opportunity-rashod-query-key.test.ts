import { describe, expect, it } from 'vitest';

import { buildOpportunityRashodQueryKey } from './opportunity-rashod-query-key';

describe('buildOpportunityRashodQueryKey', () => {
  it('sorts ids so key is order-independent', () => {
    expect(buildOpportunityRashodQueryKey(['b', 'a'])).toEqual(
      buildOpportunityRashodQueryKey(['a', 'b']),
    );
  });

  it('changes when membership changes', () => {
    expect(buildOpportunityRashodQueryKey(['a'])).not.toEqual(
      buildOpportunityRashodQueryKey(['a', 'b']),
    );
  });
});
