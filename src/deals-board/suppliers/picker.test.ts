import { describe, expect, it } from 'vitest';
import { filterSuppliersForPicker, nextSupplierOnTipChange, usesSupplierPicker } from './picker';

const yura = {
  id: 's1',
  name: 'Юра',
  category: 'BANNERA',
  isActive: true,
};
const hidden = { ...yura, id: 's2', name: 'Саша Марда', isActive: false };
const print = {
  id: 's3',
  name: 'Глав принт',
  category: 'PODRYAD',
  isActive: true,
};

describe('usesSupplierPicker', () => {
  it('is true only for banner and contractor', () => {
    expect(usesSupplierPicker('BANNERA')).toBe(true);
    expect(usesSupplierPicker('PODRYAD')).toBe(true);
    expect(usesSupplierPicker('PLENKA')).toBe(false);
  });
});

describe('filterSuppliersForPicker', () => {
  it('keeps active matches plus current even if inactive', () => {
    const list = filterSuppliersForPicker([yura, hidden, print], 'BANNERA', 's2');
    expect(list.map((s) => s.id)).toEqual(['s1', 's2']);
  });
});

describe('nextSupplierOnTipChange', () => {
  it('clears when leaving picker tips', () => {
    expect(
      nextSupplierOnTipChange({
        nextTip: 'PLENKA',
        currentSupplierId: 's1',
        currentSupplierCategory: 'BANNERA',
      }),
    ).toBeNull();
  });
  it('clears when banner↔contractor category mismatches', () => {
    expect(
      nextSupplierOnTipChange({
        nextTip: 'PODRYAD',
        currentSupplierId: 's1',
        currentSupplierCategory: 'BANNERA',
      }),
    ).toBeNull();
  });
  it('keeps when category matches new tip', () => {
    expect(
      nextSupplierOnTipChange({
        nextTip: 'BANNERA',
        currentSupplierId: 's1',
        currentSupplierCategory: 'BANNERA',
      }),
    ).toBe('s1');
  });
});
