import { describe, expect, it } from 'vitest';
import {
  filterSuppliersForPicker,
  nextSupplierOnTipChange,
  supplierDropdownRows,
  usesSupplierPicker,
} from './picker';

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

describe('supplierDropdownRows', () => {
  const options = [yura, print];

  it('lists every option when the draft is empty', () => {
    expect(supplierDropdownRows('', options)).toEqual([
      { kind: 'option', supplier: yura },
      { kind: 'option', supplier: print },
    ]);
  });

  it('filters by substring and offers create when nothing matches exactly', () => {
    expect(supplierDropdownRows('юр', options)).toEqual([
      { kind: 'option', supplier: yura },
      { kind: 'create', name: 'юр' },
    ]);
  });

  it('does not offer create when the draft matches a name', () => {
    expect(supplierDropdownRows('Юра', options)).toEqual([{ kind: 'option', supplier: yura }]);
  });

  it('keeps one row when the same contractor was saved several times', () => {
    const clones = [
      { id: 'a1', name: 'AAAA', category: 'PODRYAD', isActive: true },
      { id: 'a2', name: 'AAAA', category: 'PODRYAD', isActive: true },
      { id: 'a3', name: 'aaaa', category: 'PODRYAD', isActive: true },
    ];
    const list = filterSuppliersForPicker(clones, 'PODRYAD', 'a2');
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe('a2');
    expect(supplierDropdownRows('AAAA', list)).toEqual([
      { kind: 'option', supplier: list[0] },
    ]);
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
