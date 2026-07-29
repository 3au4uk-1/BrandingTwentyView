import { useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchLineItemListStatus,
  fetchLineItemsListStatusBatch,
  isCrmparserConfigured,
  type LineItemListStatus,
} from '../api/crmparser';

export const lineItemListStatusQueryKey = (lineItemId: string) =>
  ['lineItemListStatus', lineItemId] as const;

export const lineItemListStatusesBatchQueryKey = (idsKey: string) =>
  ['lineItemListStatusesBatch', idsKey] as const;

export const useLineItemListStatus = (lineItemId: string | undefined) =>
  useQuery<LineItemListStatus | null>({
    queryKey: lineItemListStatusQueryKey(lineItemId ?? ''),
    queryFn: () => fetchLineItemListStatus(lineItemId!),
    enabled: Boolean(lineItemId) && isCrmparserConfigured(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

/** Prefetch list-status for all visible line items in one batch and seed per-id cache. */
export const usePrefetchLineItemListStatuses = (
  lineItemIds: string[],
  enabled = true,
) => {
  const queryClient = useQueryClient();
  const idsKey = useMemo(() => {
    const unique = [...new Set(lineItemIds.map((id) => id.trim()).filter(Boolean))];
    unique.sort();
    return unique.join(',');
  }, [lineItemIds]);

  return useQuery({
    queryKey: lineItemListStatusesBatchQueryKey(idsKey),
    queryFn: async () => {
      const ids = idsKey ? idsKey.split(',') : [];
      const statuses = await fetchLineItemsListStatusBatch(ids);
      for (const [id, status] of Object.entries(statuses)) {
        queryClient.setQueryData(lineItemListStatusQueryKey(id), status);
      }
      return statuses;
    },
    enabled: enabled && Boolean(idsKey) && isCrmparserConfigured(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });
};
