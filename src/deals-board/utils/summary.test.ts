import { describe, expect, it } from 'vitest';
import { buildStageSummary } from './summary';

describe('buildStageSummary', () => {
  it('aggregates stages into chips text', () => {
    const result = buildStageSummary([
      { stage: 'V_PECHATI' },
      { stage: 'V_PECHATI' },
      { stage: 'OKLEYKA' },
    ]);
    expect(result).toBe('3 поз.: 2 печать · 1 оклейка');
  });

  it('returns zero positions text', () => {
    expect(buildStageSummary([])).toBe('0 позиций');
  });
});
