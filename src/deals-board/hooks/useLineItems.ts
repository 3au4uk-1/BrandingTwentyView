import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { LineItemStage } from 'src/constants/stages';

import {
  fetchLineItemsByOpportunityIds,
  updateLineItem,
} from '../api/line-items';
import type { LineItemRow } from '../types';

export const lineItemsQueryKey = (
  opportunityIds: string[],
  stageFilter?: string[],
) => ['lineItems', opportunityIds, stageFilter] as const;

const sortIds = (ids: string[]) => [...ids].sort();

export const useLineItems = (
  opportunityIds: string[],
  stageFilter?: LineItemStage[],
  enabled = true,
) => {
  const sortedIds = sortIds(opportunityIds);

  return useQuery({
    queryKey: lineItemsQueryKey(sortedIds, stageFilter),
    queryFn: () => fetchLineItemsByOpportunityIds(sortedIds, stageFilter),
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

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['lineItems'] });
    },
  });
};
