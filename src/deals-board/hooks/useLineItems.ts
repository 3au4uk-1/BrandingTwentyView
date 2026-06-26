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

const hasOptimisticField = (
  data: Parameters<typeof updateLineItem>[1],
): boolean =>
  'stage' in data ||
  'kolichestvo' in data ||
  'kommentariy' in data ||
  'ssylkaNaMakety' in data ||
  'plenka' in data;

const applyOptimisticPatch = (
  item: LineItemRow,
  data: Parameters<typeof updateLineItem>[1],
): LineItemRow => {
  const nextItem: LineItemRow = { ...item };

  if ('stage' in data) nextItem.stage = (data.stage ?? null) as LineItemStage | null;
  if ('kolichestvo' in data) nextItem.kolichestvo = data.kolichestvo;
  if ('kommentariy' in data) nextItem.kommentariy = data.kommentariy;
  if ('ssylkaNaMakety' in data) nextItem.ssylkaNaMakety = data.ssylkaNaMakety;
  if ('plenka' in data) nextItem.plenka = data.plenka;

  return nextItem;
};

export const useUpdateLineItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof updateLineItem>[1];
    }) => updateLineItem(id, data),

    onMutate: async ({ id, data }) => {
      if (!hasOptimisticField(data)) return { snapshots: [] as LineItemsSnapshot[] };

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
