import { findSupplierByNameAndCategory } from '../api/suppliers';
import { isVacantSupplierName, normalizeSupplierName, supplierNamesEqual } from './supplier-name';
import type { SupplierRow } from './picker';

const createdByKey = new Map<string, SupplierRow>();
const inflightByKey = new Map<string, Promise<SupplierRow>>();

const supplierCreateKey = (category: string, name: string): string =>
  `${category}::${normalizeSupplierName(name).toLocaleLowerCase('ru-RU')}`;

export const resetSupplierCreateMemoForTests = (): void => {
  createdByKey.clear();
  inflightByKey.clear();
};

type CommitSupplierDeps = {
  name: string;
  currentLabel: string | null;
  tip: string;
  recordId: string;
  currentSupplierId: string | null;
  suppliers: SupplierRow[];
  createSupplier: (input: { name: string; category: string }) => Promise<SupplierRow>;
  updateSupplier: (id: string, data: { isActive?: boolean }) => Promise<void>;
  updateLineItem: (id: string, data: { supplierId: string | null }) => Promise<unknown>;
};

export const shouldCommitSupplierName = (
  name: string,
  currentLabel: string | null,
): boolean => {
  const next = isVacantSupplierName(name) ? '' : name;
  const prev = isVacantSupplierName(currentLabel ?? '') ? '' : (currentLabel ?? '');
  return !supplierNamesEqual(next, prev);
};

export type SupplierCommitInFlightGuard = {
  tryAcquire: () => boolean;
  release: () => void;
};

export const createSupplierCommitInFlightGuard = (): SupplierCommitInFlightGuard => {
  let inFlight = false;
  return {
    tryAcquire() {
      if (inFlight) {
        return false;
      }
      inFlight = true;
      return true;
    },
    release() {
      inFlight = false;
    },
  };
};

export type GuardedCommitResult = 'committed' | 'skipped-in-flight' | 'skipped-unchanged';

export const commitSupplierNameGuarded = async (
  guard: SupplierCommitInFlightGuard,
  deps: CommitSupplierDeps,
): Promise<GuardedCommitResult> => {
  if (!guard.tryAcquire()) {
    return 'skipped-in-flight';
  }

  try {
    if (!shouldCommitSupplierName(deps.name, deps.currentLabel)) {
      return 'skipped-unchanged';
    }
    await commitSupplierName(deps);
    return 'committed';
  } finally {
    guard.release();
  }
};

export const commitSupplierName = async ({
  name,
  currentLabel,
  tip,
  recordId,
  currentSupplierId,
  suppliers,
  createSupplier,
  updateSupplier,
  updateLineItem,
}: CommitSupplierDeps): Promise<void> => {
  if (!shouldCommitSupplierName(name, currentLabel)) {
    return;
  }

  const normalized = isVacantSupplierName(name) ? '' : normalizeSupplierName(name);
  if (!normalized) {
    if (currentSupplierId) {
      await updateLineItem(recordId, { supplierId: null });
    }
    return;
  }

  const catalog = [...createdByKey.values(), ...suppliers];
  let row = findSupplierByNameAndCategory(catalog, normalized, tip);
  if (row) {
    createdByKey.set(supplierCreateKey(tip, normalized), row);
    if (!row.isActive) {
      await updateSupplier(row.id, { isActive: true });
    }
  } else {
    const key = supplierCreateKey(tip, normalized);
    let pending = inflightByKey.get(key);
    if (!pending) {
      pending = createSupplier({ name: normalized, category: tip }).then((created) => {
        createdByKey.set(key, created);
        return created;
      });
      inflightByKey.set(key, pending);
      void pending.finally(() => {
        inflightByKey.delete(key);
      });
    }
    row = await pending;
  }

  await updateLineItem(recordId, { supplierId: row.id });
};
