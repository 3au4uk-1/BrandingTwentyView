import { describe, expect, it } from 'vitest';

import {
  clampHourToWorkWindow,
  normalizePrintTime,
  PRINT_WORK_HOURS,
  snapMinuteToTen,
} from './normalize-print-time';

describe('normalizePrintTime', () => {
  it('converts 1200 to 12:00', () => {
    expect(normalizePrintTime('1200')).toBe('12:00');
  });

  it('keeps HH:mm', () => {
    expect(normalizePrintTime('18:00')).toBe('18:00');
  });

  it('returns empty for blank', () => {
    expect(normalizePrintTime('')).toBe('');
  });
});

describe('snapMinuteToTen', () => {
  it('keeps tens unchanged', () => {
    expect(snapMinuteToTen('30')).toBe('30');
  });

  it('rounds to nearest ten', () => {
    expect(snapMinuteToTen('14')).toBe('10');
    expect(snapMinuteToTen('15')).toBe('20');
  });
});

describe('PRINT_WORK_HOURS', () => {
  it('is 08 through 22 inclusive', () => {
    expect(PRINT_WORK_HOURS[0]).toBe('08');
    expect(PRINT_WORK_HOURS[PRINT_WORK_HOURS.length - 1]).toBe('22');
    expect(PRINT_WORK_HOURS).toHaveLength(15);
    expect(PRINT_WORK_HOURS).not.toContain('07');
    expect(PRINT_WORK_HOURS).not.toContain('23');
  });
});

describe('clampHourToWorkWindow', () => {
  it('keeps in-range hours padded', () => {
    expect(clampHourToWorkWindow('9')).toBe('09');
    expect(clampHourToWorkWindow('08')).toBe('08');
    expect(clampHourToWorkWindow('22')).toBe('22');
    expect(clampHourToWorkWindow('14')).toBe('14');
  });

  it('clamps below 08 and above 22', () => {
    expect(clampHourToWorkWindow('00')).toBe('08');
    expect(clampHourToWorkWindow('07')).toBe('08');
    expect(clampHourToWorkWindow('23')).toBe('22');
    expect(clampHourToWorkWindow('24')).toBe('22');
  });

  it('falls back for non-numeric', () => {
    expect(clampHourToWorkWindow('')).toBe('09');
    expect(clampHourToWorkWindow('xx')).toBe('09');
  });
});
