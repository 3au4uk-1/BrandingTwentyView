import { describe, expect, it } from 'vitest';

import { beginBusy } from './BannerCrewModal';

describe('beginBusy', () => {
  it('claims an idle ref and rejects a second claim until released', () => {
    const ref = { current: false };

    expect(beginBusy(ref)).toBe(true);
    expect(ref.current).toBe(true);
    expect(beginBusy(ref)).toBe(false);
    expect(ref.current).toBe(true);

    ref.current = false;
    expect(beginBusy(ref)).toBe(true);
  });
});
