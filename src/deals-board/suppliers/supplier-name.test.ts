import { describe, expect, it } from 'vitest';
import {
  isVacantSupplierName,
  normalizeSupplierName,
  supplierNamesEqual,
} from './supplier-name';

describe('normalizeSupplierName', () => {
  it('trims and collapses inner spaces', () => {
    expect(normalizeSupplierName('  Саша   Марда ')).toBe('Саша Марда');
  });
  it('rejects empty', () => {
    expect(normalizeSupplierName('   ')).toBe('');
  });
});

describe('supplierNamesEqual', () => {
  it('ignores case and spacing', () => {
    expect(supplierNamesEqual('Саша Марда', 'саша  марда')).toBe(true);
  });
});

describe('isVacantSupplierName', () => {
  it('treats empty and кто едет? as no supplier', () => {
    expect(isVacantSupplierName('')).toBe(true);
    expect(isVacantSupplierName('   ')).toBe(true);
    expect(isVacantSupplierName('кто едет?')).toBe(true);
    expect(isVacantSupplierName('Кто Едет?')).toBe(true);
  });

  it('keeps real names', () => {
    expect(isVacantSupplierName('Юра')).toBe(false);
  });
});
