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

describe('toggleGroupExpandKey exclusive', () => {
  it('opens a group', () => {
    expect(toggleGroupExpandKey({}, 'item-1', 'g-a')).toEqual({ 'item-1:g-a': true });
  });

  it('closes the same group on second toggle', () => {
    const open = { 'item-1:g-a': true };
    expect(toggleGroupExpandKey(open, 'item-1', 'g-a')).toEqual({ 'item-1:g-a': false });
  });

  it('switching groups closes the previous on the same item', () => {
    const open = { 'item-1:g-a': true };
    const next = toggleGroupExpandKey(open, 'item-1', 'g-b');
    expect(next['item-1:g-a']).toBeFalsy();
    expect(next['item-1:g-b']).toBe(true);
  });

  it('does not close another item group', () => {
    const open = { 'item-1:g-a': true, 'item-2:g-a': true };
    const next = toggleGroupExpandKey(open, 'item-1', 'g-b');
    expect(next['item-2:g-a']).toBe(true);
    expect(next['item-1:g-b']).toBe(true);
    expect(next['item-1:g-a']).toBeFalsy();
  });
});
