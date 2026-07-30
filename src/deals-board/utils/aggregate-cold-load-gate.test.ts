import { describe, expect, it } from 'vitest';
import {
  provisionalAggregateViewId,
  shouldEnableAggregateColdLoad,
} from './aggregate-cold-load-gate';

describe('shouldEnableAggregateColdLoad', () => {
  it('is true when aggregate path and views not in error', () => {
    expect(
      shouldEnableAggregateColdLoad({ useAggregateColdPath: true, viewsIsError: false }),
    ).toBe(true);
  });

  it('is false when not aggregate path', () => {
    expect(
      shouldEnableAggregateColdLoad({ useAggregateColdPath: false, viewsIsError: false }),
    ).toBe(false);
  });

  it('is false when views errored', () => {
    expect(
      shouldEnableAggregateColdLoad({ useAggregateColdPath: true, viewsIsError: true }),
    ).toBe(false);
  });
});

describe('provisionalAggregateViewId', () => {
  it('uses real id when present', () => {
    expect(provisionalAggregateViewId('abc')).toBe('abc');
  });
  it('uses provisional-future when missing', () => {
    expect(provisionalAggregateViewId(undefined)).toBe('provisional-future');
  });
});
