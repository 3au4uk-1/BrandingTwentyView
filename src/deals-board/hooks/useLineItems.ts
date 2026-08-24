import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createLineItem,
  fetchLineItemsByOpportunityIds,
  type LineItemQueryFilters,
  updateLineItem,
} from '../api/line-items';
import type { LineItemRow } from '../types';
import { runAfterLineItemUpdate } from '../automations/run-after-line-item-update';
import { nextPoryadok } from '../utils/line-item-order';
import {
  defaultManualLineItemBaseline,
  setManualLineItemBaseline,
} from '../utils/manual-line-item-baselines';
import { syncManualLineItemAfterUpdate, syncNewManualLineItemToParser } from './useManualLineItemParserSync';
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
    staleTime: 30_000,
  });
};

export const useCreateLineItem = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (opportunityId: string) => {
      const siblings: LineItemRow[] = [];
      for (const [, items] of queryClient.getQueriesData<LineItemRow[]>({
        queryKey: ['lineItems'],
      })) {
        for (const item of items ?? []) {
          if (item.opportunityId === opportunityId) siblings.push(item);
        }
      }
      return createLineItem(opportunityId, nextPoryadok(siblings));
    },
    onSuccess: (lineItemId, opportunityId) => {
      setManualLineItemBaseline(
        queryClient,
        lineItemId,
        defaultManualLineItemBaseline(),
      );

      void syncNewManualLineItemToParser(queryClient, lineItemId, opportunityId);

      void Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ['lineItems'] }),
        syncDealStage(queryClient, opportunityId),
      ]);
    },
  });
};

type LineItemsSnapshot = {
  queryKey: readonly unknown[];
  data: LineItemRow[] | undefined;
};

export const applyOptimisticPatch = (
  item: LineItemRow,
  data: Record<string, unknown>,
): LineItemRow => {
  const next: LineItemRow = { ...item, ...data };
  if (Object.prototype.hasOwnProperty.call(data, 'supplierId')) {
    if (data.supplierId == null) {
      next.supplierId = null;
      next.supplier = null;
    } else if (typeof data.supplierId === 'string') {
      next.supplierId = data.supplierId;
    }
  }
  return next;
};

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
      if (Object.keys(data).length === 0) {
        return { snapshots: [] as LineItemsSnapshot[], previousItem: undefined as LineItemRow | undefined };
      }

      await queryClient.cancelQueries({ queryKey: ['lineItems'] });

      const snapshots: LineItemsSnapshot[] = [];
      let previousItem: LineItemRow | undefined;

      for (const [queryKey, items] of queryClient.getQueriesData<LineItemRow[]>({
        queryKey: ['lineItems'],
      })) {
        snapshots.push({ queryKey, data: items });

        if (items) {
          if (!previousItem) {
            previousItem = items.find((item) => item.id === id);
          }
          queryClient.setQueryData<LineItemRow[]>(
            queryKey,
            items.map((item) =>
              item.id === id ? applyOptimisticPatch(item, data) : item,
            ),
          );
        }
      }

      return { snapshots, previousItem };
    },

    onError: (_error, _variables, context) => {
      for (const { queryKey, data } of context?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },

    onSettled: async (_data, error, { id, data }, context) => {
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

      if (!error) {
        await syncManualLineItemAfterUpdate(queryClient, id, data);
        await runAfterLineItemUpdate(queryClient, {
          id,
          patch: data,
          previousItem: context?.previousItem,
        });
      }

      if (error) {
        queryClient.invalidateQueries({ queryKey: ['lineItems'] });
        return;
      }

      if (opportunityId) {
        await syncDealStage(queryClient, opportunityId);
      }
    },
  });
};
