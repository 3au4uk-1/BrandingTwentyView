import { useMutation, useQueryClient } from '@tanstack/react-query';

import { patchOpportunity } from '../api/opportunities';
import { updateLineItem } from '../api/line-items';
import type { BoardObjectName } from '../metadata/types';

export const useUpdateRecord = (objectName: BoardObjectName) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      objectName === 'dealLineItem' ? updateLineItem(id, data) : patchOpportunity(id, data),
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: objectName === 'dealLineItem' ? ['lineItems'] : ['opportunities'],
      });
    },
  });
};
