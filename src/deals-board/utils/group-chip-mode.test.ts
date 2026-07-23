import { describe, expect, it } from 'vitest';

import { toggleGroupExpandKey } from '../hooks/useLineItemGroupExpand';

describe('toggleGroupExpandKey', () => {
  it('flips only the requested line-item group key without mutating state', () => {
    const state = {
      'line-item-1:group-a': true,
      'line-item-2:group-b': true,
    };

    const next = toggleGroupExpandKey(state, 'line-item-1', 'group-a');

    expect(next).toEqual({
      'line-item-1:group-a': false,
      'line-item-2:group-b': true,
    });
    expect(next).not.toBe(state);
    expect(state['line-item-1:group-a']).toBe(true);
  });

  it('turns a missing key on', () => {
    expect(toggleGroupExpandKey({}, 'line-item-1', 'group-a')).toEqual({
      'line-item-1:group-a': true,
    });
  });
});
