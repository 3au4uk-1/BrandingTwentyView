import { describe, expect, it } from 'vitest';
import { countRestorationMatches } from './restoration-count';

describe('countRestorationMatches', () => {
  it('counts only restorationMatch true', () => {
    expect(
      countRestorationMatches([
        {
          restorationMatch: true,
          blacklisted: false,
          podryadMatch: false,
          bannerMatch: false,
          pattern: null,
          dealId: null,
          dealTwentyId: null,
        },
        {
          restorationMatch: false,
          blacklisted: false,
          podryadMatch: false,
          bannerMatch: false,
          pattern: null,
          dealId: null,
          dealTwentyId: null,
        },
        null,
        undefined,
      ]),
    ).toBe(1);
  });
});
