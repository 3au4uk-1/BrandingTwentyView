import { RestApiClient } from 'twenty-client-sdk/rest';

import type { SupplierRow } from '../suppliers/picker';
import { normalizeSupplierName, supplierNamesEqual } from '../suppliers/supplier-name';

let restClient: RestApiClient | null = null;
const getRestClient = (): RestApiClient => {
  if (!restClient) restClient = new RestApiClient();
  return restClient;
};

const mapSupplier = (raw: Record<string, unknown>): SupplierRow | null => {
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  return {
    id: raw.id,
    name: raw.name,
    category: typeof raw.category === 'string' ? raw.category : null,
    isActive: raw.isActive !== false,
  };
};

export const findSupplierByNameAndCategory = (
  suppliers: SupplierRow[],
  name: string,
  category: string,
): SupplierRow | undefined =>
  suppliers.find(
    (row) =>
      row.category === category && supplierNamesEqual(row.name, normalizeSupplierName(name)),
  );

export const fetchSuppliers = async (): Promise<SupplierRow[]> => {
  const response = await getRestClient().get<unknown>('/rest/suppliers', {
    query: { limit: 200, depth: 0 },
  });
  const body = response as Record<string, unknown>;
  const list =
    (body.data as { suppliers?: unknown[] } | undefined)?.suppliers ??
    (body as { suppliers?: unknown[] }).suppliers ??
    (Array.isArray(body.data) ? body.data : []);
  return (Array.isArray(list) ? list : [])
    .map((row) => (row && typeof row === 'object' ? mapSupplier(row as Record<string, unknown>) : null))
    .filter((row): row is SupplierRow => row !== null);
};

export const createSupplier = async (input: {
  name: string;
  category: string;
}): Promise<SupplierRow> => {
  const name = normalizeSupplierName(input.name);
  if (!name) throw new Error('Пустое имя поставщика');
  const response = await getRestClient().post<unknown>('/rest/suppliers', {
    name,
    category: input.category,
    isActive: true,
  });
  const record =
    (response as { data?: { supplier?: Record<string, unknown> } }).data?.supplier ??
    (response as { supplier?: Record<string, unknown> }).supplier ??
    (response as Record<string, unknown>);
  const mapped = mapSupplier(record as Record<string, unknown>);
  if (!mapped) throw new Error('Не удалось создать поставщика');
  return mapped;
};

export const updateSupplier = async (
  id: string,
  data: { isActive?: boolean; category?: string },
): Promise<void> => {
  await getRestClient().patch(`/rest/suppliers/${id}`, data);
};
