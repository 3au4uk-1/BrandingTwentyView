import { RestApiClient } from 'twenty-client-sdk/rest';

import type { LineItemRow, OpportunityRow } from '../types';
import { extractRestPageInfo, normalizeRestListResponse } from '../api/rest-list';
import { getApiClient } from '../api/client';
import { asArray } from '../utils/parse-json-field';

const PAGE_LIMIT = 200;

const normalizeLineItem = (raw: unknown): LineItemRow | null => {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.id !== 'string') return null;
  const opportunityId =
    typeof item.opportunityId === 'string'
      ? item.opportunityId
      : item.opportunity && typeof item.opportunity === 'object'
        ? String((item.opportunity as { id?: string }).id ?? '')
        : '';
  if (!opportunityId) return null;
  return {
    ...(item as LineItemRow),
    id: item.id,
    name: typeof item.name === 'string' ? item.name : '',
    opportunityId,
  };
};

/** PLENKA + NASHI + OKLEYKA|GOTOVO — salary export source. */
export const fetchOkleykaSalaryLineItems = async (): Promise<LineItemRow[]> => {
  const client = new RestApiClient();
  const filter =
    'and(tip[eq]:"PLENKA",tipDetail[eq]:"NASHI",stage[in]:["OKLEYKA","GOTOVO"])';
  const all: LineItemRow[] = [];
  let after: string | undefined;

  do {
    const response = await client.get<unknown>('/rest/dealLineItems', {
      query: {
        filter,
        limit: PAGE_LIMIT,
        ...(after ? { after } : {}),
      },
    });
    const page = normalizeRestListResponse<unknown>(response, 'dealLineItems')
      .map(normalizeLineItem)
      .filter((row): row is LineItemRow => row !== null);
    all.push(...page);
    const pageInfo = extractRestPageInfo(response);
    after =
      pageInfo.hasNextPage && pageInfo.endCursor ? String(pageInfo.endCursor) : undefined;
  } while (after);

  return all;
};

export const fetchOpportunitiesByIdsForSalary = async (
  ids: string[],
): Promise<OpportunityRow[]> => {
  if (ids.length === 0) return [];
  const client = getApiClient();
  const unique = [...new Set(ids)];
  const result = await client.query({
    opportunities: {
      __args: {
        filter: { id: { in: unique } },
        first: Math.min(unique.length, 200),
      },
      edges: {
        node: {
          id: true,
          name: true,
          bitrixLink: { primaryLinkUrl: true, primaryLinkLabel: true },
        },
      },
    },
  });
  return asArray<{ node: OpportunityRow }>(result.opportunities?.edges).map((e) => e.node);
};
