import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchLineItemsByOpportunityIds,
  type LineItemQueryFilters,
  updateLineItem,
} from '../api/line-items';
import type { LineItemRow } from '../types';
import { syncDealStage } from '../utils/sync-deal-stage';

export const lineItemsQueryKey = (
  opportunityIds: string[],
  filters?: LineItemQueryFilters,
) => ['lineItems', opportunityIds, filters] as const;

const sortIds = (ids: string[]) => [...ids].sort();

export const useLineItems = (
  opportunityIds: string[],
  filters?: LineItemQueryFilters,
  enabled = true,
) => {
  const sortedIds = sortIds(opportunityIds);

  return useQuery({
    queryKey: lineItemsQueryKey(sortedIds, filters),
    queryFn: () => fetchLineItemsByOpportunityIds(sortedIds, filters),
    enabled: enabled && sortedIds.length > 0,
  });
};

type LineItemsSnapshot = {
  queryKey: readonly unknown[];
  data: LineItemRow[] | undefined;
};

const applyOptimisticPatch = (
  item: LineItemRow,
  data: Record<string, unknown>,
): LineItemRow => ({
  ...item,
  ...data,
});

export const useUpdateLineItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Record<string, unknown>;
    }) => updateLineItem(id, data),

    onMutate: async ({ id, data }) => {
      if (Object.keys(data).length === 0) return { snapshots: [] as LineItemsSnapshot[] };

      await queryClient.cancelQueries({ queryKey: ['lineItems'] });

      const snapshots: LineItemsSnapshot[] = [];

      for (const [queryKey, items] of queryClient.getQueriesData<LineItemRow[]>({
        queryKey: ['lineItems'],
      })) {
        snapshots.push({ queryKey, data: items });

        if (items) {
          queryClient.setQueryData<LineItemRow[]>(
            queryKey,
            items.map((item) =>
              item.id === id ? applyOptimisticPatch(item, data) : item,
            ),
          );
        }
      }

      return { snapshots };
    },

    onError: (_error, _variables, context) => {
      for (const { queryKey, data } of context?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },

    onSettled: async (_data, _error, { id }) => {
      let opportunityId: string | undefined;

      for (const [, items] of queryClient.getQueriesData<LineItemRow[]>({
        queryKey: ['lineItems'],
      })) {
        const match = items?.find((item) => item.id === id);
        if (match) {
          opportunityId = match.opportunityId;
          break;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['lineItems'] });

      if (opportunityId) {
        await syncDealStage(queryClient, opportunityId);
      }
    },
  });
};
