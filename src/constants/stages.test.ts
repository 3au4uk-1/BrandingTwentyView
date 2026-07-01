import { describe, expect, it } from 'vitest';

import {
  LINE_ITEM_STAGES,
  OPPORTUNITY_STAGES,
  getOpportunityStageColor,
  getOpportunityStageLabel,
  getStageLabel,
} from './stages';

describe('LINE_ITEM_STAGES', () => {
  it('includes contractor stage', () => {
    expect(LINE_ITEM_STAGES.map((stage) => stage.value)).toContain('PODRYAD');
    expect(LINE_ITEM_STAGES.map((stage) => stage.value)).not.toContain('BANNERA');
  });

  it('resolves contractor stage label', () => {
    expect(getStageLabel('PODRYAD')).toBe('Подряд');
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
    expect(getOpportunityStageColor('OTCHET_STAS')).not.toBe('gray');
  });

  it('assigns color to DUBL', () => {
    expect(getOpportunityStageColor('DUBL')).toBe('yellow');
  });
});
