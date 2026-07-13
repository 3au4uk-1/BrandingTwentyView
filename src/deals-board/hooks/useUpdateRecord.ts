import { useMutation, useQueryClient } from '@tanstack/react-query';

import { patchOpportunity } from '../api/opportunities';
import { updateLineItem } from '../api/line-items';
import type { BoardObjectName } from '../metadata/types';
import type { OpportunityRow } from '../types';
import { syncManualLineItemAfterUpdate } from './useManualLineItemParserSync';

type OpportunitiesPage = {
  records: OpportunityRow[];
  totalCount: number;
};

type QuerySnapshot = {
  queryKey: readonly unknown[];
  data: OpportunitiesPage | undefined;
};

export const useUpdateRecord = (objectName: BoardObjectName) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      objectName === 'dealLineItem' ? updateLineItem(id, data) : patchOpportunity(id, data),

    onMutate: async ({ id, data }) => {
      if (objectName !== 'opportunity' || Object.keys(data).length === 0) {
        return { snapshots: [] as QuerySnapshot[] };
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

      return { snapshots };
    },

    onError: (_error, _variables, context) => {
      for (const { queryKey, data } of context?.snapshots ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
    },

    onSettled: async (_data, error, variables) => {
      if (objectName === 'dealLineItem' && !error) {
        await syncManualLineItemAfterUpdate(queryClient, variables.id, variables.data);
      }

      queryClient.invalidateQueries({
        queryKey: objectName === 'dealLineItem' ? ['lineItems'] : ['opportunities'],
      });
    },
  });
};
