import { describe, expect, it } from 'vitest';
import { LABOR_WORK_OPTIONS, LABOR_WORK } from './labor-work';

describe('LABOR_WORK_OPTIONS', () => {
  it('has okleyka and contract wrapping', () => {
    expect(LABOR_WORK.OKLEYKA).toBe('OKLEYKA');
    expect(LABOR_WORK.PODRYADNAYA_OKLEYKA).toBe('PODRYADNAYA_OKLEYKA');
    expect(LABOR_WORK_OPTIONS.map((o) => o.value)).toEqual([
      'OKLEYKA',
      'PODRYADNAYA_OKLEYKA',
    ]);
  });
});
