import { describe, expect, it } from 'vitest';

import { computeDealStage } from './compute-deal-stage';

const item = (stage: string) => ({ stage });

describe('computeDealStage', () => {
  it('returns OTMENA when no active positions', () => {
    expect(computeDealStage([])).toBe('OTMENA');
    expect(computeDealStage([item('OTMENA'), item('OTMENA')])).toBe('OTMENA');
  });

  it('returns NOVYY when all active are NOVYY', () => {
    expect(computeDealStage([item('NOVYY'), item('NOVYY')])).toBe('NOVYY');
    expect(computeDealStage([item('NOVYY'), item('OTMENA')])).toBe('NOVYY');
  });

  it('returns GOTOVO when all active are GOTOVO', () => {
    expect(computeDealStage([item('GOTOVO'), item('GOTOVO')])).toBe('GOTOVO');
    expect(computeDealStage([item('GOTOVO'), item('OTMENA')])).toBe('GOTOVO');
  });

  it('returns V_RABOTE for mixed progress', () => {
    expect(computeDealStage([item('GOTOVO'), item('OKLEYKA')])).toBe('V_RABOTE');
    expect(computeDealStage([item('V_PECHATI')])).toBe('V_RABOTE');
  });

  it('never returns OTCHET_STAS', () => {
    const result = computeDealStage([item('GOTOVO')]);
    expect(result).not.toBe('OTCHET_STAS');
  });
});
