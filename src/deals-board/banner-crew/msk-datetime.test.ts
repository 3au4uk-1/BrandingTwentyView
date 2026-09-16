import { describe, expect, it } from 'vitest';
import {
  getMskWeekRange,
  isoToMskParts,
  mskPartsToIso,
  shiftMskWeek,
  validateLocationTimes,
} from './msk-datetime';

const WEDNESDAY_INSTANT = new Date('2026-09-09T12:00:00.000Z');

describe('getMskWeekRange', () => {
  it('returns Mon 00:00 MSK through next Mon 00:00 MSK for a Wednesday instant', () => {
    const range = getMskWeekRange(WEDNESDAY_INSTANT);
    expect(range.startIso).toBe('2026-09-06T21:00:00.000Z');
    expect(range.endIso).toBe('2026-09-13T21:00:00.000Z');
    expect(range.days).toHaveLength(7);
    expect(range.days[0]).toBe('2026-09-07');
    expect(range.days[6]).toBe('2026-09-13');
  });
});

describe('shiftMskWeek', () => {
  it('adds weeks * 7 days to the Monday', () => {
    const week = getMskWeekRange(WEDNESDAY_INSTANT);
    const next = shiftMskWeek(week, 1);
    expect(next.startIso).toBe('2026-09-13T21:00:00.000Z');
    expect(next.endIso).toBe('2026-09-20T21:00:00.000Z');
    expect(next.days[0]).toBe('2026-09-14');
    expect(next.days[6]).toBe('2026-09-20');
  });
});

describe('mskPartsToIso / isoToMskParts', () => {
  it('round-trips MSK date and time through UTC ISO', () => {
    const iso = mskPartsToIso('2026-09-08', '10:00');
    expect(isoToMskParts(iso)).toEqual({ date: '2026-09-08', time: '10:00' });
  });

  it('returns null for invalid ISO', () => {
    expect(isoToMskParts('not-a-date')).toBeNull();
  });
});

describe('validateLocationTimes', () => {
  it('treats both-null as draft ok, one null as incomplete, equal instants as invalid', () => {
    expect(validateLocationTimes(null, null)).toBe('ok');
    expect(validateLocationTimes('2026-09-08T07:00:00.000Z', null)).toBe('incomplete');
    expect(
      validateLocationTimes('2026-09-08T07:00:00.000Z', '2026-09-08T07:00:00.000Z'),
    ).toBe('invalid');
  });
});
