import { RestApiClient } from 'twenty-client-sdk/rest';

import type { LineItemRow } from '../types';

let restClient: RestApiClient | null = null;

const getRestClient = (): RestApiClient => {
  if (!restClient) restClient = new RestApiClient();
  return restClient;
};

type RestListResponse<T> = {
  data?: T[];
};

const buildListQuery = (opportunityIds: string[], stageFilter?: string[]) => {
  const query: Record<string, string | number> = { limit: 500 };
  query['filter[opportunityId][in]'] = opportunityIds.join(',');
  if (stageFilter?.length) {
    query['filter[stage][in]'] = stageFilter.join(',');
  }
  return query;
};

export const fetchLineItemsByOpportunityIds = async (
  opportunityIds: string[],
  stageFilter?: string[],
): Promise<LineItemRow[]> => {
  if (opportunityIds.length === 0) return [];

  const client = getRestClient();
  const response = await client.get<RestListResponse<LineItemRow>>('/rest/dealLineItems', {
    query: buildListQuery(opportunityIds, stageFilter),
  });

  return response.data ?? [];
};

export const updateLineItem = async (
  id: string,
  data: Partial<Pick<LineItemRow, 'stage' | 'kolichestvo' | 'kommentariy'>> & {
    ssylkaNaMakety?: { primaryLinkUrl: string; primaryLinkLabel?: string };
    plenka?: { markdown: string };
  },
): Promise<void> => {
  const client = getRestClient();
  await client.patch(`/rest/dealLineItems/${id}`, data);
};
