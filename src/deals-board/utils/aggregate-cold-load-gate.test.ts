import { describe, expect, it } from 'vitest';
import {
  provisionalAggregateViewId,
  shouldEnableAggregateColdLoad,
} from './aggregate-cold-load-gate';

describe('shouldEnableAggregateColdLoad', () => {
  const ready = {
    useAggregateColdPath: true,
    viewsIsError: false,
    parentFieldsReady: true,
    viewsReady: true,
  };

  it('is true when aggregate path and fields/views ready', () => {
    expect(shouldEnableAggregateColdLoad(ready)).toBe(true);
  });

  it('is false when parent fields are not ready', () => {
    expect(shouldEnableAggregateColdLoad({ ...ready, parentFieldsReady: false })).toBe(false);
  });

  it('is false when views list is still loading', () => {
    expect(shouldEnableAggregateColdLoad({ ...ready, viewsReady: false })).toBe(false);
  });

  it('is false when not aggregate path', () => {
    expect(shouldEnableAggregateColdLoad({ ...ready, useAggregateColdPath: false })).toBe(false);
  });

  it('is false when views errored', () => {
    expect(shouldEnableAggregateColdLoad({ ...ready, viewsIsError: true })).toBe(false);
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
