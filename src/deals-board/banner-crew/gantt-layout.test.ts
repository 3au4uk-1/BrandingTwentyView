import { describe, expect, it } from 'vitest';

import { ganttBarRect } from './gantt-layout';

const WEEK_START = '2026-09-06T21:00:00.000Z';
const WEEK_END = '2026-09-13T21:00:00.000Z';

describe('ganttBarRect', () => {
  it('maps a slot covering the full week to 0–100%', () => {
    expect(ganttBarRect(WEEK_START, WEEK_END, WEEK_START, WEEK_END)).toEqual({
      leftPct: 0,
      widthPct: 100,
    });
  });

  it('returns null when the slot is entirely before the week', () => {
    expect(
      ganttBarRect(
        '2026-09-01T00:00:00.000Z',
        '2026-09-06T21:00:00.000Z',
        WEEK_START,
        WEEK_END,
      ),
    ).toBeNull();
  });

  it('places Tuesday 00:00–Wednesday 00:00 MSK at 1/7 of the week', () => {
    const rect = ganttBarRect(
      '2026-09-07T21:00:00.000Z',
      '2026-09-08T21:00:00.000Z',
      WEEK_START,
      WEEK_END,
    );
    expect(rect).not.toBeNull();
    expect(rect!.leftPct).toBeCloseTo(14.285, 1);
    expect(rect!.widthPct).toBeCloseTo(14.285, 1);
  });
});
