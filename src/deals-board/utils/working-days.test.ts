import { describe, expect, it } from 'vitest';

import { getTodayInputDateMsk, workingDaysUntil } from './working-days';

describe('workingDaysUntil', () => {
  it('returns 0 for same day or past', () => {
    expect(workingDaysUntil('2026-07-27', '2026-07-27')).toBe(0);
    expect(workingDaysUntil('2026-07-27', '2026-07-26')).toBe(0);
  });

  it('counts Mon–Fri only through event inclusive', () => {
    // Mon 27 → Fri 31: Tue Wed Thu Fri = 4
    expect(workingDaysUntil('2026-07-27', '2026-07-31')).toBe(4);
    // Mon 27 → Wed 29: Tue Wed = 2
    expect(workingDaysUntil('2026-07-27', '2026-07-29')).toBe(2);
  });

  it('skips weekends (Fri → Tue)', () => {
    // Fri 24 → Tue 28: Mon Tue = 2 (Sat Sun skipped)
    expect(workingDaysUntil('2026-07-24', '2026-07-28')).toBe(2);
  });
});

describe('getTodayInputDateMsk', () => {
  it('formats a fixed instant as MSK calendar day', () => {
    // 2026-07-27 22:30 UTC = 2026-07-28 01:30 MSK
    const instant = new Date('2026-07-27T22:30:00.000Z');
    expect(getTodayInputDateMsk(instant)).toBe('2026-07-28');
  });
});
