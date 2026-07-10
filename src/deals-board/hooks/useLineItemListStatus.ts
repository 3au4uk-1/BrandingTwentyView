import { useQuery } from '@tanstack/react-query';

import {
  fetchLineItemListStatus,
  isCrmparserConfigured,
  type LineItemListStatus,
} from '../api/crmparser';

export const lineItemListStatusQueryKey = (lineItemId: string) =>
  ['lineItemListStatus', lineItemId] as const;

export const useLineItemListStatus = (lineItemId: string | undefined) =>
  useQuery<LineItemListStatus | null>({
    queryKey: lineItemListStatusQueryKey(lineItemId ?? ''),
    queryFn: () => fetchLineItemListStatus(lineItemId!),
    enabled: Boolean(lineItemId) && isCrmparserConfigured(),
    staleTime: 30_000,
  });
