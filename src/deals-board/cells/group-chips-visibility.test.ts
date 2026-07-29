import { describe, expect, it } from 'vitest';

import { shouldShowRestorationMaketChip } from './group-chips-visibility';

describe('shouldShowRestorationMaketChip', () => {
  it('is disabled for this cycle', () => {
    expect(
      shouldShowRestorationMaketChip({
        id: '1',
        opportunityId: 'o',
        name: 'x',
        tip: 'RESTAVRACIYA',
        ssylkaNaMakety: { primaryLinkUrl: 'https://disk/x' },
      }),
    ).toBe(false);
  });
});
