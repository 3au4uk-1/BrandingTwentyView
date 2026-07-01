import { describe, expect, it } from 'vitest';

import {
  LINE_ITEM_TYPES,
  getLineItemTypeColor,
  getLineItemTypeLabel,
} from './line-item-types';

describe('LINE_ITEM_TYPES', () => {
  it('has banner and film types', () => {
    expect(LINE_ITEM_TYPES.map((type) => type.value)).toEqual(['BANNERA', 'PLENKA']);
  });

  it('resolves Russian labels', () => {
    expect(getLineItemTypeLabel('BANNERA')).toBe('Баннера');
    expect(getLineItemTypeLabel('PLENKA')).toBe('Плёнка');
  });

  it('assigns distinct colors', () => {
    expect(getLineItemTypeColor('BANNERA')).toBe('blue');
    expect(getLineItemTypeColor('PLENKA')).toBe('green');
  });
});
