import { describe, expect, it } from 'vitest';

import { collectViewportWidthCandidates } from './viewport-width';

describe('collectViewportWidthCandidates', () => {
  it('returns an empty array without window or element', () => {
    expect(collectViewportWidthCandidates(null)).toEqual([]);
  });

  it('reads width from the owner document view', () => {
    const element = {
      ownerDocument: {
        defaultView: {
          innerWidth: 390,
          visualViewport: { width: 384 },
        },
      },
    } as unknown as HTMLElement;

    expect(collectViewportWidthCandidates(element)).toEqual([384]);
  });
});
