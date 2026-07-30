import { describe, expect, it } from 'vitest';

import {
  buildOkleykaDraft,
  buildOkleykaMessage,
  extractBookingId,
  formatOkleykaAlreadySentNotice,
  formatOkleykaMessage,
} from './okleyka-message';

describe('extractBookingId', () => {
  it('takes first 5–6 digit run from deal name', () => {
    expect(
      extractBookingId('АРЕНДА/28-30.07/рулетка Алина тг/180288/Полякова'),
    ).toBe('180288');
    expect(extractBookingId('АРЕНДА/26.07/Екатерина/Ретро-игры/179512Фест./Фидж.')).toBe(
      '179512',
    );
  });

  it('returns empty when missing', () => {
    expect(extractBookingId('АРЕНДА/28-30.07/без брони')).toBe('');
    expect(extractBookingId(undefined)).toBe('');
  });
});

describe('buildOkleykaDraft / formatOkleykaMessage', () => {
  it('uses plenka first line and booking from name, not loadDate/tipDetail', () => {
    const draft = buildOkleykaDraft({
      opportunity: {
        name: 'АРЕНДА/28-30.07/x/180288/y',
        loadDate: '2026-08-01T10:00:00.000Z',
      },
      lineItem: {
        name: 'Фотобудка квадратная',
        kolichestvo: 1,
        tipDetail: 'NASHI',
        plenka: { markdown: '324\nOracal detail' },
        kommentariy: 'угол слева',
      },
    });
    expect(draft).toEqual({
      order: 'АРЕНДА/28-30.07/x/180288/y',
      booking: '180288',
      film: '324',
      equipment: 'Фотобудка квадратная × 1',
      comment: 'угол слева',
    });
    expect(formatOkleykaMessage(draft)).toBe(
      [
        'Заказ: АРЕНДА/28-30.07/x/180288/y',
        'Бронь: 180288',
        'Плёнка: 324',
        'Оборудование: Фотобудка квадратная × 1',
        'Комментарий: угол слева',
      ].join('\n'),
    );
  });

  it('omits comment line when empty', () => {
    const text = buildOkleykaMessage({
      opportunity: { name: 'ПРО/01.08/тест/12345' },
      lineItem: { name: 'Автомат', kolichestvo: 2, plenka: { markdown: '312' } },
    });
    expect(text).not.toContain('Комментарий:');
    expect(text).toContain('Плёнка: 312');
    expect(text).toContain('Бронь: 12345');
  });
});

describe('formatOkleykaAlreadySentNotice', () => {
  it('includes lastSentAt when present', () => {
    expect(formatOkleykaAlreadySentNotice('2026-07-29T12:00:00.000Z')).toBe(
      'Уже отправляли 2026-07-29T12:00:00.000Z.',
    );
  });

  it('falls back when lastSentAt missing', () => {
    expect(formatOkleykaAlreadySentNotice(null)).toBe(
      'Уже отправляли эту позицию.',
    );
    expect(formatOkleykaAlreadySentNotice(undefined)).toBe(
      'Уже отправляли эту позицию.',
    );
    expect(formatOkleykaAlreadySentNotice('  ')).toBe(
      'Уже отправляли эту позицию.',
    );
  });
});
