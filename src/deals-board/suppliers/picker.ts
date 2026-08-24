import type { LineItemType } from 'src/constants/line-item-types';

export type SupplierRow = {
  id: string;
  name: string;
  category: string | null;
  isActive: boolean;
};

export const usesSupplierPicker = (
  tip: string | null | undefined,
): tip is 'BANNERA' | 'PODRYAD' => tip === 'BANNERA' || tip === 'PODRYAD';

export const filterSuppliersForPicker = (
  suppliers: SupplierRow[],
  tip: string,
  selectedId: string | null,
): SupplierRow[] =>
  suppliers.filter(
    (supplier) =>
      supplier.category === tip &&
      (supplier.isActive || supplier.id === selectedId),
  );

export type SupplierDropdownRow =
  | { kind: 'option'; supplier: SupplierRow }
  | { kind: 'create'; name: string };

export const supplierDropdownRows = (
  draft: string,
  options: SupplierRow[],
): SupplierDropdownRow[] => {
  const trimmed = draft.trim();
  const query = trimmed.toLowerCase();
  const filtered = query
    ? options.filter((supplier) => supplier.name.toLowerCase().includes(query))
    : options;
  const exact = Boolean(
    query && options.some((supplier) => supplier.name.trim().toLowerCase() === query),
  );
  const rows: SupplierDropdownRow[] = filtered.map((supplier) => ({
    kind: 'option',
    supplier,
  }));
  if (query && !exact) {
    rows.push({ kind: 'create', name: trimmed });
  }
  return rows;
};

export const nextSupplierOnTipChange = ({
  nextTip,
  currentSupplierId,
  currentSupplierCategory,
}: {
  nextTip: LineItemType | string | null;
  currentSupplierId: string | null | undefined;
  currentSupplierCategory: string | null | undefined;
}): string | null => {
  if (!currentSupplierId) return null;
  if (!usesSupplierPicker(nextTip)) return null;
  if (currentSupplierCategory !== nextTip) return null;
  return currentSupplierId;
};
