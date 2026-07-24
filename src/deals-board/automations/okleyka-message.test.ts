import { describe, expect, it } from 'vitest';

import { buildOkleykaMessage } from './okleyka-message';

describe('buildOkleykaMessage', () => {
  it('builds a copyable block', () => {
    const text = buildOkleykaMessage({
      opportunity: {
        name: 'ПРО/01.08/тест',
        loadDate: '2026-08-01T10:00:00.000Z',
      },
      lineItem: {
        name: 'Автомат Хватайка',
        kolichestvo: 2,
        tipDetail: 'NASHI',
      },
    });
    expect(text).toContain('Заказ: ПРО/01.08/тест');
    expect(text).toContain('Бронь:');
    expect(text).toContain('Плёнка: Наши');
    expect(text).toContain('Оборудование: Автомат Хватайка × 2');
  });
});
