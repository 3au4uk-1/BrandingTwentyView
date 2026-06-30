import { describe, expect, it } from 'vitest';

import { normalizePrintTime, snapMinuteToTen } from './normalize-print-time';

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
