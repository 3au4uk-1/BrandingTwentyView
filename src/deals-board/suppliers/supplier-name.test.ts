import { describe, expect, it } from 'vitest';
import { normalizeSupplierName, supplierNamesEqual } from './supplier-name';

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
