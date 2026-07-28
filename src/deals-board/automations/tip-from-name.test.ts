import { describe, expect, it } from 'vitest';

import { inferTipFromName, planTipFromName } from './tip-from-name';

describe('inferTipFromName', () => {
  it('maps branding / plenka keywords to PLENKA', () => {
    expect(inferTipFromName('Брендинг Хватайка')).toBe('PLENKA');
    expect(inferTipFromName('Оклейка корпуса')).toBe('PLENKA');
    expect(inferTipFromName('плёнка кабина')).toBe('PLENKA');
    expect(inferTipFromName('Пленка борт')).toBe('PLENKA');
  });

  it('maps banner to BANNERA', () => {
    expect(inferTipFromName('Баннер ББ с люверсами')).toBe('BANNERA');
  });

  it('maps подряд / производство / реставрация', () => {
    expect(inferTipFromName('Подряд монтаж')).toBe('PODRYAD');
    expect(inferTipFromName('Производство фрезеровка')).toBe('PROIZVODSTVO');
    expect(inferTipFromName('Реставрация оклейки')).toBe('RESTAVRACIYA');
  });

  it('prefers restoration over branding when both present', () => {
    expect(inferTipFromName('Реставрация брендинг кабины')).toBe('RESTAVRACIYA');
  });

  it('returns null when no keyword', () => {
    expect(inferTipFromName('Хватайка автомат')).toBeNull();
    expect(inferTipFromName('')).toBeNull();
  });
});

describe('planTipFromName', () => {
  it('patches when tip differs', () => {
    expect(planTipFromName('Брендинг тест', 'BANNERA')).toEqual({ tip: 'PLENKA' });
  });

  it('returns null when tip already matches', () => {
    expect(planTipFromName('Брендинг тест', 'PLENKA')).toBeNull();
  });

  it('overwrites empty tip', () => {
    expect(planTipFromName('Баннер 3х6', null)).toEqual({ tip: 'BANNERA' });
  });
});
