import { getApiClient } from './client';
import type { LineItemRow } from '../types';

const LINE_ITEM_FIELDS = {
  id: true,
  opportunityId: true,
  name: true,
  kolichestvo: true,
  amount: { amountMicros: true, currencyCode: true },
  kommentariy: true,
  stage: true,
  ssylkaNaMakety: { primaryLinkUrl: true, primaryLinkLabel: true },
  plenka: { markdown: true },
} as const;

export const fetchLineItemsByOpportunityIds = async (
  opportunityIds: string[],
  stageFilter?: string[],
): Promise<LineItemRow[]> => {
  if (opportunityIds.length === 0) return [];
  const client = getApiClient();
  const filter: Record<string, unknown> = {
    opportunityId: { in: opportunityIds },
  };
  if (stageFilter?.length) filter.stage = { in: stageFilter };

  const result = await client.query({
    dealLineItems: {
      __args: { first: 500, filter },
      edges: { node: LINE_ITEM_FIELDS },
    },
  });

  return (result.dealLineItems?.edges ?? []).map((e) => e.node as LineItemRow);
};

export const updateLineItem = async (
  id: string,
  data: Partial<Pick<LineItemRow, 'stage' | 'kolichestvo' | 'kommentariy'>> & {
    ssylkaNaMakety?: { primaryLinkUrl: string; primaryLinkLabel?: string };
    plenka?: { markdown: string };
  },
): Promise<void> => {
  const client = getApiClient();
  await client.mutation({
    updateDealLineItem: {
      __args: { id, data },
      id: true,
    },
  });
};
