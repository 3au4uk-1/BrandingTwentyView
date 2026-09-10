import { describe, expect, it } from 'vitest';

import { formatFilterClauseLabel } from './format-clause-label';

describe('formatFilterClauseLabel', () => {
  it('labels deal stage as Стадия with opportunity captions', () => {
    expect(
      formatFilterClauseLabel({
        id: '1',
        level: 'deal',
        field: 'stage',
        operator: 'in',
        value: ['OTCHET_STAS', 'DUBL'],
      }),
    ).toBe('Стадия: Отчёт Стас, ДУБЛЬ');
  });

  it('labels lineItem stage as Стадия позиции', () => {
    expect(
      formatFilterClauseLabel({
        id: '1',
        level: 'lineItem',
        field: 'stage',
        operator: 'in',
        value: ['V_PECHATI'],
      }),
    ).toBe('Стадия позиции: В печати');
  });
});
