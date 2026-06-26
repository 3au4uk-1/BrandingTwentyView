import { getApiClient } from './client';

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
