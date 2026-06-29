import { getApiClient } from './client';

export type CompanyOption = {
  id: string;
  name: string;
};

const COMPANIES_PAGE_SIZE = 200;

export const fetchCompanyNames = async (ids: string[]): Promise<Map<string, string>> => {
  if (ids.length === 0) return new Map();

  const client = getApiClient();
  const result = await client.query({
    companies: {
      __args: {
        first: ids.length,
        filter: { id: { in: ids } },
      },
      edges: { node: { id: true, name: true } },
    },
  });

  const map = new Map<string, string>();
  for (const edge of result.companies?.edges ?? []) {
    map.set(edge.node.id, edge.node.name);
  }
  return map;
};

export const fetchCompanies = async (params?: {
  search?: string;
  limit?: number;
}): Promise<CompanyOption[]> => {
  const client = getApiClient();
  const limit = params?.limit ?? COMPANIES_PAGE_SIZE;
  const search = params?.search?.trim();
  const filter = search ? { name: { ilike: `%${search}%` } } : undefined;

  const result = await client.query({
    companies: {
      __args: {
        first: limit,
        orderBy: [{ name: 'AscNullsFirst' as const }],
        ...(filter ? { filter } : {}),
      },
      edges: { node: { id: true, name: true } },
    },
  });

  return (result.companies?.edges ?? []).map((edge) => edge.node);
};
