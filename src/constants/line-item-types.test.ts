import { describe, expect, it } from 'vitest';

import {
  LINE_ITEM_TYPES,
  getLineItemTypeColor,
  getLineItemTypeLabel,
} from './line-item-types';

describe('LINE_ITEM_TYPES', () => {
  it('has banner, film, contractor, production, restoration and not-ours types', () => {
    expect(LINE_ITEM_TYPES.map((type) => type.value)).toEqual([
      'BANNERA',
      'PLENKA',
      'PODRYAD',
      'PROIZVODSTVO',
      'RESTAVRACIYA',
      'NE_NASHE',
    ]);
  });

  it('resolves Russian labels', () => {
    expect(getLineItemTypeLabel('BANNERA')).toBe('Баннера');
    expect(getLineItemTypeLabel('PLENKA')).toBe('Оклейка');
    expect(getLineItemTypeLabel('PODRYAD')).toBe('Подряд');
    expect(getLineItemTypeLabel('PROIZVODSTVO')).toBe('Производство');
    expect(getLineItemTypeLabel('RESTAVRACIYA')).toBe('Рест. оклейка');
    expect(getLineItemTypeLabel('NE_NASHE')).toBe('Не наше');
  });

  it('assigns distinct colors', () => {
    expect(getLineItemTypeColor('BANNERA')).toBe('green');
    expect(getLineItemTypeColor('PLENKA')).toBe('blue');
    expect(getLineItemTypeColor('PODRYAD')).toBe('purple');
    expect(getLineItemTypeColor('PROIZVODSTVO')).toBe('orange');
    expect(getLineItemTypeColor('RESTAVRACIYA')).toBe('pink');
    expect(getLineItemTypeColor('NE_NASHE')).toBe('gray');
  });
});
