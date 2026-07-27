import { describe, expect, it } from 'vitest';

import { computeAttention, isAttentionEligible } from './compute';

describe('isAttentionEligible', () => {
  it('requires mapped tip, active stage, and window', () => {
    expect(isAttentionEligible('PODRYAD', 'V_RABOTE', 4)).toBe(true);
    expect(isAttentionEligible('PODRYAD', 'V_RABOTE', 5)).toBe(false);
    expect(isAttentionEligible('PLENKA', 'V_PECHATI', 3)).toBe(true);
    expect(isAttentionEligible('PLENKA', 'NOVYY', 1)).toBe(false);
    expect(isAttentionEligible('PLENKA', 'GOTOVO', 1)).toBe(false);
    expect(isAttentionEligible('BANNERA', 'OTMENA', 0)).toBe(false);
    expect(isAttentionEligible('NE_NASHE', 'V_RABOTE', 1)).toBe(false);
  });
});

describe('computeAttention', () => {
  it('flags line items within tip window by loadDate', () => {
    const opps = new Map([
      ['a', { id: 'a', loadDate: '2026-07-31T10:00:00.000Z' }],
      ['b', { id: 'b', loadDate: '2026-08-10T10:00:00.000Z' }],
    ]);

    const stats = computeAttention(
      '2026-07-27',
      [
        {
          id: '1',
          opportunityId: 'a',
          name: 'x',
          tip: 'PODRYAD',
          stage: 'V_RABOTE',
        },
        {
          id: '2',
          opportunityId: 'a',
          name: 'y',
          tip: 'PLENKA',
          stage: 'V_PECHATI',
        },
        {
          id: '3',
          opportunityId: 'b',
          name: 'z',
          tip: 'BANNERA',
          stage: 'V_RABOTE',
        },
        {
          id: '4',
          opportunityId: 'a',
          name: 'w',
          tip: 'PODRYAD',
          stage: 'NOVYY',
        },
      ],
      opps,
    );

    // Mon 27 → Fri 31 = 4 workdays: PODRYAD ok, PLENKA window 3 → not
    expect(stats.total).toBe(1);
    expect(stats.byTip.PODRYAD).toBe(1);
    expect(stats.lineItemIds.has('1')).toBe(true);
    expect(stats.lineItemIds.has('2')).toBe(false);
    expect(stats.opportunityIds.has('a')).toBe(true);
  });
});
