import { findSupplierByNameAndCategory } from '../api/suppliers';
import { normalizeSupplierName } from './supplier-name';
import type { SupplierRow } from './picker';

type CommitSupplierDeps = {
  name: string;
  tip: string;
  recordId: string;
  currentSupplierId: string | null;
  suppliers: SupplierRow[];
  createSupplier: (input: { name: string; category: string }) => Promise<SupplierRow>;
  updateSupplier: (id: string, data: { isActive?: boolean }) => Promise<void>;
  updateLineItem: (id: string, data: { supplierId: string | null }) => Promise<unknown>;
};

export const commitSupplierName = async ({
  name,
  tip,
  recordId,
  currentSupplierId,
  suppliers,
  createSupplier,
  updateSupplier,
  updateLineItem,
}: CommitSupplierDeps): Promise<void> => {
  const normalized = normalizeSupplierName(name);
  if (!normalized) {
    if (currentSupplierId) {
      await updateLineItem(recordId, { supplierId: null });
    }
    return;
  }

  let row = findSupplierByNameAndCategory(suppliers, normalized, tip);
  if (row) {
    if (!row.isActive) {
      await updateSupplier(row.id, { isActive: true });
    }
  } else {
    row = await createSupplier({ name: normalized, category: tip });
  }

  await updateLineItem(recordId, { supplierId: row.id });
};
