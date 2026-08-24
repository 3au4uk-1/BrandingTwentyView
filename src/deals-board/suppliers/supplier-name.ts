export const normalizeSupplierName = (raw: string): string =>
  raw.trim().replace(/\s+/g, ' ');

export const supplierNamesEqual = (a: string, b: string): boolean =>
  normalizeSupplierName(a).toLocaleLowerCase('ru-RU') ===
  normalizeSupplierName(b).toLocaleLowerCase('ru-RU');
