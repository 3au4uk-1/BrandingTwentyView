import { describe, expect, it } from 'vitest';

import {
  LINE_ITEM_STAGES,
  OPPORTUNITY_STAGES,
  getOpportunityStageColor,
  getOpportunityStageLabel,
} from './stages';

describe('LINE_ITEM_STAGES', () => {
  it('does not include banner or contractor values', () => {
    const values = LINE_ITEM_STAGES.map((stage) => stage.value);
    expect(values).not.toContain('BANNERA');
    expect(values).not.toContain('PODRYAD');
  });

  it('maps stage colors', () => {
    expect(LINE_ITEM_STAGES.find((stage) => stage.value === 'NOVYY')?.color).toBe('white');
    expect(LINE_ITEM_STAGES.find((stage) => stage.value === 'V_RABOTE')?.color).toBe('orange');
    expect(LINE_ITEM_STAGES.find((stage) => stage.value === 'V_PECHATI')?.color).toBe('yellow');
    expect(LINE_ITEM_STAGES.find((stage) => stage.value === 'OKLEYKA')?.color).toBe('blue');
    expect(LINE_ITEM_STAGES.find((stage) => stage.value === 'RESTAVRACIYA')?.color).toBe('purple');
  });
});

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
    expect(getOpportunityStageColor('OTCHET_STAS')).toBe('greenDark');
  });

  it('assigns color to DUBL', () => {
    expect(getOpportunityStageColor('DUBL')).toBe('yellow');
  });
});
