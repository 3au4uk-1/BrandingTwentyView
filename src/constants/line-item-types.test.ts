import { describe, expect, it } from 'vitest';

import {
  LINE_ITEM_TYPES,
  getLineItemTypeColor,
  getLineItemTypeLabel,
} from './line-item-types';

describe('LINE_ITEM_TYPES', () => {
  it('has banner, film and contractor types', () => {
    expect(LINE_ITEM_TYPES.map((type) => type.value)).toEqual(['BANNERA', 'PLENKA', 'PODRYAD']);
  });

  it('resolves Russian labels', () => {
    expect(getLineItemTypeLabel('BANNERA')).toBe('Баннера');
    expect(getLineItemTypeLabel('PLENKA')).toBe('Плёнка');
    expect(getLineItemTypeLabel('PODRYAD')).toBe('Подряд');
  });

  it('assigns distinct colors', () => {
    expect(getLineItemTypeColor('BANNERA')).toBe('blue');
    expect(getLineItemTypeColor('PLENKA')).toBe('green');
    expect(getLineItemTypeColor('PODRYAD')).toBe('purple');
  });
});
