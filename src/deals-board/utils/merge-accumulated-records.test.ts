import { describe, expect, it } from 'vitest';

import { mergeAccumulatedRecords } from './merge-accumulated-records';

describe('mergeAccumulatedRecords', () => {
  it('updates existing ids in place and appends new ones', () => {
    const prev = [
      { id: 'a', stage: 'NEW' },
      { id: 'b', stage: 'NEW' },
    ];
    const visible = [
      { id: 'b', stage: 'WON' },
      { id: 'c', stage: 'NEW' },
    ];

    expect(mergeAccumulatedRecords(prev, visible)).toEqual([
      { id: 'a', stage: 'NEW' },
      { id: 'b', stage: 'WON' },
      { id: 'c', stage: 'NEW' },
    ]);
  });

  it('replaces when prev is empty', () => {
    expect(mergeAccumulatedRecords([], [{ id: 'a', stage: 'NEW' }])).toEqual([
      { id: 'a', stage: 'NEW' },
    ]);
  });

  it('truncates to maxLength after merge', () => {
    const prev = [{ id: 'a' }, { id: 'b' }];
    const visible = [{ id: 'c' }];
    expect(mergeAccumulatedRecords(prev, visible, { maxLength: 2 })).toEqual([
      { id: 'a' },
      { id: 'b' },
    ]);
  });
});
