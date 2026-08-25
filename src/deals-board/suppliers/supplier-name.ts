import { getTipDetailLabel } from 'src/constants/tip-detail';

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

/** Linked supplier wins; otherwise keep the old tipDetail label on historical rows. */
export const displaySupplierCellLabel = (
  supplierName: string | null | undefined,
  tipDetail: string | null | undefined,
): string => {
  const linked = typeof supplierName === 'string' ? normalizeSupplierName(supplierName) : '';
  if (linked && !isVacantSupplierName(linked)) {
    return linked;
  }
  if (typeof tipDetail !== 'string' || !tipDetail.trim()) {
    return '';
  }
  const historical = getTipDetailLabel(tipDetail);
  if (isVacantSupplierName(historical)) {
    return '';
  }
  return historical;
};
