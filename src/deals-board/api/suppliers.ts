import { RestApiClient } from 'twenty-client-sdk/rest';

import type { SupplierRow } from '../suppliers/picker';
import { normalizeSupplierName, supplierNamesEqual } from '../suppliers/supplier-name';

let restClient: RestApiClient | null = null;
const getRestClient = (): RestApiClient => {
  if (!restClient) restClient = new RestApiClient();
  return restClient;
};

type SupplierClient = Pick<RestApiClient, 'get' | 'post' | 'patch'>;

const inflightByKey = new Map<string, Promise<SupplierRow>>();

const supplierEnsureKey = (category: string, name: string): string =>
  `${category}::${normalizeSupplierName(name).toLocaleLowerCase('ru-RU')}`;

const mapSupplier = (raw: Record<string, unknown>): SupplierRow | null => {
  if (typeof raw.id !== 'string' || typeof raw.name !== 'string') return null;
  return {
    id: raw.id,
    name: raw.name,
    category: typeof raw.category === 'string' ? raw.category : null,
    isActive: raw.isActive !== false,
  };
};

const unwrapCreatedSupplier = (response: unknown): Record<string, unknown> | null => {
  if (!response || typeof response !== 'object') return null;
  const body = response as Record<string, unknown>;
  const data = body.data;
  if (data && typeof data === 'object') {
    const nested = data as Record<string, unknown>;
    if (nested.supplier && typeof nested.supplier === 'object') {
      return nested.supplier as Record<string, unknown>;
    }
    if (nested.createSupplier && typeof nested.createSupplier === 'object') {
      return nested.createSupplier as Record<string, unknown>;
    }
  }
  if (body.supplier && typeof body.supplier === 'object') {
    return body.supplier as Record<string, unknown>;
  }
  if (body.createSupplier && typeof body.createSupplier === 'object') {
    return body.createSupplier as Record<string, unknown>;
  }
  return body;
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

const unwrapSupplierList = (response: unknown): unknown[] => {
  const body = response as Record<string, unknown>;
  const list =
    (body.data as { suppliers?: unknown[] } | undefined)?.suppliers ??
    (body as { suppliers?: unknown[] }).suppliers ??
    (Array.isArray(body.data) ? body.data : []);
  return Array.isArray(list) ? list : [];
};

export const fetchSuppliersWithClient = async (
  client: Pick<RestApiClient, 'get'>,
): Promise<SupplierRow[]> => {
  const response = await client.get<unknown>('/rest/suppliers', {
    query: { limit: 200, depth: 0 },
  });
  return unwrapSupplierList(response)
    .map((row) => (row && typeof row === 'object' ? mapSupplier(row as Record<string, unknown>) : null))
    .filter((row): row is SupplierRow => row !== null);
};

export const fetchSuppliers = async (): Promise<SupplierRow[]> =>
  fetchSuppliersWithClient(getRestClient());

export const ensureSupplierWithClient = async (
  client: SupplierClient,
  input: { name: string; category: string },
): Promise<SupplierRow> => {
  const name = normalizeSupplierName(input.name);
  if (!name) throw new Error('Пустое имя поставщика');
  const key = supplierEnsureKey(input.category, name);
  const inflight = inflightByKey.get(key);
  if (inflight) return inflight;

  const pending = (async (): Promise<SupplierRow> => {
    const existing = findSupplierByNameAndCategory(
      await fetchSuppliersWithClient(client),
      name,
      input.category,
    );
    if (existing) {
      if (!existing.isActive) {
        await client.patch(`/rest/suppliers/${existing.id}`, { isActive: true });
        return { ...existing, isActive: true };
      }
      return existing;
    }

    const response = await client.post<unknown>('/rest/suppliers', {
      name,
      category: input.category,
      isActive: true,
    });
    const mapped = mapSupplier(unwrapCreatedSupplier(response) ?? {});
    if (!mapped) throw new Error('Не удалось создать поставщика');
    return mapped;
  })();

  inflightByKey.set(key, pending);
  void pending.finally(() => {
    inflightByKey.delete(key);
  });
  return pending;
};

export const createSupplier = async (input: {
  name: string;
  category: string;
}): Promise<SupplierRow> => ensureSupplierWithClient(getRestClient(), input);

export const updateSupplier = async (
  id: string,
  data: { isActive?: boolean; category?: string },
): Promise<void> => {
  await getRestClient().patch(`/rest/suppliers/${id}`, data);
};
