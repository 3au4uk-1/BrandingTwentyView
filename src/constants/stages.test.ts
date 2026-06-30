import { describe, expect, it } from 'vitest';

import {
  OPPORTUNITY_STAGES,
  getOpportunityStageColor,
  getOpportunityStageLabel,
} from './stages';

describe('OPPORTUNITY_STAGES', () => {
  it('has exactly six deal stages', () => {
    expect(OPPORTUNITY_STAGES.map((s) => s.value)).toEqual([
      'NOVYY',
      'V_RABOTE',
      'GOTOVO',
      'OTCHET_STAS',
      'DUBL',
      'OTMENA',
    ]);
  });

  it('resolves Отчёт Стас label', () => {
    expect(getOpportunityStageLabel('OTCHET_STAS')).toBe('Отчёт Стас');
  });

  it('resolves ДУБЛЬ label', () => {
    expect(getOpportunityStageLabel('DUBL')).toBe('ДУБЛЬ');
  });

  it('assigns color to OTCHET_STAS', () => {
    expect(getOpportunityStageColor('OTCHET_STAS')).not.toBe('gray');
  });

  it('assigns color to DUBL', () => {
    expect(getOpportunityStageColor('DUBL')).toBe('yellow');
  });
});
