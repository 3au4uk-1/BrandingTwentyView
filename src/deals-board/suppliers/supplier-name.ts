export const normalizeSupplierName = (raw: string): string =>
  raw.trim().replace(/\s+/g, ' ');

export const supplierNamesEqual = (a: string, b: string): boolean =>
  normalizeSupplierName(a).toLocaleLowerCase('ru-RU') ===
  normalizeSupplierName(b).toLocaleLowerCase('ru-RU');

/** Empty cell, or the legacy BANNERA placeholder — not a real supplier name. */
export const isVacantSupplierName = (raw: string): boolean => {
  const normalized = normalizeSupplierName(raw);
  if (!normalized) return true;
  return supplierNamesEqual(normalized, 'кто едет?');
};
