import { describe, expect, it } from 'vitest';

import { buildBoardEventsPath } from './board-events-path';

describe('buildBoardEventsPath', () => {
  it('returns the bare path when no cursor is known yet', () => {
    expect(buildBoardEventsPath(undefined)).toBe('/twenty/events');
    expect(buildBoardEventsPath({})).toBe('/twenty/events');
  });

  it('forwards since and epoch', () => {
    expect(
      buildBoardEventsPath({ since: '42', epoch: 'e1b9c0d4-1111-4222-8333-444455556666' }),
    ).toBe('/twenty/events?since=42&epoch=e1b9c0d4-1111-4222-8333-444455556666');
  });

  it('drops a non-numeric since', () => {
    expect(buildBoardEventsPath({ since: 'abc', epoch: 'e1' })).toBe('/twenty/events?epoch=e1');
  });

  it('ignores blank values and unknown parameters', () => {
    expect(buildBoardEventsPath({ since: '  ', epoch: '', extra: 'x' })).toBe('/twenty/events');
  });

  it('encodes the epoch', () => {
    expect(buildBoardEventsPath({ epoch: 'a b&c' })).toBe('/twenty/events?epoch=a+b%26c');
  });
});
