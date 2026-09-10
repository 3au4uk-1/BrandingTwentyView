import { useMutation, useQueryClient } from '@tanstack/react-query';

import { runAfterLineItemUpdate } from '../automations/run-after-line-item-update';
import { writeBackLineItemQuantity } from '../api/crmparser';
import { patchOpportunity } from '../api/opportunities';
import { updateLineItem } from '../api/line-items';
import type { BoardObjectName } from '../metadata/types';
import type { LineItemRow, OpportunityRow } from '../types';
import {
  findLineItemOpportunityId,
  patchOpportunityInCache,
} from '../utils/opportunity-cache';
import { syncManualLineItemAfterUpdate } from './useManualLineItemParserSync';

type OpportunitiesPage = {
  records: OpportunityRow[];
  totalCount: number;
};

type QuerySnapshot = {
  queryKey: readonly unknown[];
  data: OpportunitiesPage | undefined;
};

type LineItemsSnapshot = {
  queryKey: readonly unknown[];
  data: LineItemRow[] | undefined;
};

export const useUpdateRecord = (objectName: BoardObjectName) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      objectName === 'dealLineItem' ? updateLineItem(id, data) : patchOpportunity(id, data),

    onMutate: async ({ id, data }) => {
      if (Object.keys(data).length === 0) {
        return {
          snapshots: [] as QuerySnapshot[],
          lineItemSnapshots: [] as LineItemsSnapshot[],
          previousItem: undefined as LineItemRow | undefined,
        };
      }

      if (objectName === 'dealLineItem') {
        await queryClient.cancelQueries({ queryKey: ['lineItems'] });

        const lineItemSnapshots: LineItemsSnapshot[] = [];
        let previousItem: LineItemRow | undefined;

        for (const [queryKey, items] of queryClient.getQueriesData<LineItemRow[]>({
          queryKey: ['lineItems'],
        })) {
          lineItemSnapshots.push({ queryKey, data: items });
          if (items) {
            if (!previousItem) {
              previousItem = items.find((item) => item.id === id);
            }
            queryClient.setQueryData<LineItemRow[]>(
              queryKey,
              items.map((item) => (item.id === id ? { ...item, ...data } : item)),
            );
          }
        }

        return {
          snapshots: [] as QuerySnapshot[],
          lineItemSnapshots,
          previousItem,
        };
      }

      await queryClient.cancelQueries({ queryKey: ['opportunities'] });

      const snapshots: QuerySnapshot[] = [];

      for (const [queryKey, page] of queryClient.getQueriesData<OpportunitiesPage>({
        queryKey: ['opportunities'],
      })) {
        snapshots.push({ queryKey, data: page });

        if (page?.records) {
          queryClient.setQueryData<OpportunitiesPage>(queryKey, {
            ...page,
            records: page.records.map((record) =>
              record.id === id ? { ...record, ...data } : record,
            ),
          });
        }
      }

      return {
        snapshots,
        lineItemSnapshots: [] as LineItemsSnapshot[],
        previousItem: undefined as LineItemRow | undefined,
      };
    },

    onError: (_error, _variables, context) => {
      for (const { queryKey, data } of context?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
      for (const { queryKey, data } of context?.lineItemSnapshots ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },

    onSettled: async (_data, error, variables, context) => {
      if (objectName === 'dealLineItem' && !error) {
        await syncManualLineItemAfterUpdate(queryClient, variables.id, variables.data);
        if ('kolichestvo' in variables.data) {
          const qty = variables.data.kolichestvo;
          if (typeof qty === 'number' && Number.isFinite(qty) && qty > 0) {
            try {
              const result = await writeBackLineItemQuantity(variables.id, qty);
              if (typeof result.opportunityAmountRub === 'number') {
                const opportunityId = findLineItemOpportunityId(queryClient, variables.id);
                if (opportunityId) {
                  patchOpportunityInCache(queryClient, opportunityId, {
                    amount: {
                      amountMicros: Math.round(result.opportunityAmountRub * 1_000_000),
                      currencyCode: 'RUB',
                    },
                  });
                }
              }
            } catch (writeBackError) {
              window.alert(
                writeBackError instanceof Error
                  ? writeBackError.message
                  : 'Не удалось записать количество в парсер. Значение в Twenty сохранено.',
              );
            }
          }
        }
        await runAfterLineItemUpdate(queryClient, {
          id: variables.id,
          patch: variables.data,
          previousItem: context?.previousItem,
        });
      }

      if (error) {
        queryClient.invalidateQueries({
          queryKey: objectName === 'dealLineItem' ? ['lineItems'] : ['opportunities'],
        });
      }
    },
  });
};
