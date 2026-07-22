import { describe, expect, it } from 'vitest';

import { isOtmenaTransition } from './otmena-transition';

describe('isOtmenaTransition', () => {
  it('detects transition into OTMENA', () => {
    expect(isOtmenaTransition('V_RABOTE', 'OTMENA')).toBe(true);
    expect(isOtmenaTransition(null, 'OTMENA')).toBe(true);
  });

  it('ignores already cancelled and other stages', () => {
    expect(isOtmenaTransition('OTMENA', 'OTMENA')).toBe(false);
    expect(isOtmenaTransition('NOVYY', 'V_RABOTE')).toBe(false);
  });
});
