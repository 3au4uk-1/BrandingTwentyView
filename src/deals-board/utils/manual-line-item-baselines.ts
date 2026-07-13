import type { QueryClient } from '@tanstack/react-query';

import { DEFAULT_MANUAL_LINE_ITEM_NAME } from 'src/constants/line-item-origin';

import type { ManualLineItemSyncSnapshot } from './manual-line-item-sync';

export type ManualLineItemBaseline = ManualLineItemSyncSnapshot;

export const manualLineItemBaselinesQueryKey = ['manualLineItemBaselines'] as const;

type ManualLineItemBaselinesMap = Record<string, ManualLineItemBaseline>;

export const defaultManualLineItemBaseline = (): ManualLineItemBaseline => ({
  name: DEFAULT_MANUAL_LINE_ITEM_NAME,
  kolichestvo: 1,
  amountMicros: 0,
});

export const getManualLineItemBaseline = (
  queryClient: QueryClient,
  lineItemId: string,
): ManualLineItemBaseline | undefined => {
  const baselines = queryClient.getQueryData<ManualLineItemBaselinesMap>(
    manualLineItemBaselinesQueryKey,
  );
  return baselines?.[lineItemId];
};

export const setManualLineItemBaseline = (
  queryClient: QueryClient,
  lineItemId: string,
  baseline: ManualLineItemBaseline,
): void => {
  queryClient.setQueryData<ManualLineItemBaselinesMap>(
    manualLineItemBaselinesQueryKey,
    (prev) => ({
      ...prev,
      [lineItemId]: baseline,
    }),
  );
};
