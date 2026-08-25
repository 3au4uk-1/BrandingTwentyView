import { describe, expect, it } from 'vitest';
import {
  displaySupplierCellLabel,
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

describe('displaySupplierCellLabel', () => {
  it('prefers the linked supplier name', () => {
    expect(displaySupplierCellLabel('Саша Марда', 'YURA')).toBe('Саша Марда');
  });

  it('shows the historical tipDetail label when the relation is empty', () => {
    expect(displaySupplierCellLabel(null, 'YURA')).toBe('Юра');
    expect(displaySupplierCellLabel('', 'GLAV_PRINT')).toBe('Глав принт');
  });

  it('does not treat кто едет? as a filled order', () => {
    expect(displaySupplierCellLabel(null, 'KTO_EDET')).toBe('');
    expect(displaySupplierCellLabel('кто едет?', 'KTO_EDET')).toBe('');
  });

  it('keeps unknown tipDetail text so custom values are not dropped', () => {
    expect(displaySupplierCellLabel(null, 'Свой подрядчик')).toBe('Свой подрядчик');
  });
});
