import { describe, expect, it } from 'vitest';

import { resolveEventPatch } from './resolve-event-patch';

describe('resolveEventPatch', () => {
  it('prefers non-empty after', () => {
    expect(
      resolveEventPatch({
        after: { stage: 'WON' },
        diff: { stage: 'LOST' },
      }),
    ).toEqual({ stage: 'WON' });
  });

  it('returns undefined for empty after and no diff', () => {
    expect(resolveEventPatch({ after: {} })).toBeUndefined();
    expect(resolveEventPatch({})).toBeUndefined();
  });

  it('builds patch from flat diff values when after is missing', () => {
    expect(resolveEventPatch({ diff: { stage: 'DONE', name: 'X' } })).toEqual({
      stage: 'DONE',
      name: 'X',
    });
  });

  it('unwraps diff entries shaped as { after }', () => {
    expect(
      resolveEventPatch({
        diff: {
          stage: { before: 'NEW', after: 'WON' },
          comment: { after: 'hi' },
        },
      }),
    ).toEqual({ stage: 'WON', comment: 'hi' });
  });
});
