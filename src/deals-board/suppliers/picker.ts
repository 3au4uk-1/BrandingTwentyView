import type { LineItemType } from 'src/constants/line-item-types';

export type SupplierRow = {
  id: string;
  name: string;
  category: string | null;
  isActive: boolean;
};

export const usesSupplierPicker = (tip: string | null | undefined): boolean =>
  tip === 'BANNERA' || tip === 'PODRYAD';

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
