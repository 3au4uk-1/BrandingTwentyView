import type { QueryClient } from '@tanstack/react-query';

import {
  DEFAULT_MANUAL_LINE_ITEM_NAME,
  LINE_ITEM_ORIGIN,
} from 'src/constants/line-item-origin';

import { syncManualLineItem } from '../api/crmparser';
import type { LineItemRow } from '../types';
import {
  defaultManualLineItemBaseline,
  getManualLineItemBaseline,
  type ManualLineItemBaseline,
} from '../utils/manual-line-item-baselines';
import {
  buildManualLineItemSyncPayload,
  isMeaningfulManualLineItemChange,
  type ManualLineItemSyncSnapshot,
} from '../utils/manual-line-item-sync';
import {
  notifyManualSyncError,
} from '../utils/manual-sync-notify';

export const manualLineItemsSyncedQueryKey = (lineItemId: string) =>
  ['manualLineItemsSynced', lineItemId] as const;

export const isManualLineItemSyncedToParser = (
  queryClient: QueryClient,
  lineItemId: string,
): boolean => Boolean(queryClient.getQueryData(manualLineItemsSyncedQueryKey(lineItemId)));

export const setManualLineItemSyncedToParser = (
  queryClient: QueryClient,
  lineItemId: string,
): void => {
  queryClient.setQueryData(manualLineItemsSyncedQueryKey(lineItemId), true);
};

export const toSyncSnapshot = (lineItem: LineItemRow): ManualLineItemSyncSnapshot => ({
  name: lineItem.name,
  kolichestvo: lineItem.kolichestvo ?? 1,
  amountMicros: lineItem.amount?.amountMicros ?? 0,
});

export const isManualLineItemOrigin = (
  lineItem: LineItemRow,
  hasBaseline: boolean,
): boolean => {
  if (lineItem.istochnik === LINE_ITEM_ORIGIN.TWENTY_MANUAL) return true;
  if (lineItem.istochnik === LINE_ITEM_ORIGIN.PARSER) return false;
  return hasBaseline;
};

export const mergeLineItemPatch = (
  lineItem: LineItemRow,
  patch: Record<string, unknown>,
): LineItemRow => ({
  ...lineItem,
  ...patch,
  amount:
    patch.amount && typeof patch.amount === 'object'
      ? {
          ...(lineItem.amount ?? { amountMicros: 0, currencyCode: 'RUB' }),
          ...(patch.amount as { amountMicros?: number; currencyCode?: string }),
        }
      : lineItem.amount,
});

const findLineItemInCache = (
  queryClient: QueryClient,
  lineItemId: string,
): LineItemRow | undefined => {
  for (const [, items] of queryClient.getQueriesData<LineItemRow[]>({
    queryKey: ['lineItems'],
  })) {
    const match = items?.find((item) => item.id === lineItemId);
    if (match) return match;
  }
  return undefined;
};

const syncErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export async function retryManualLineItemSync(
  queryClient: QueryClient,
  lineItemId: string,
): Promise<void> {
  const performRetrySync = async (): Promise<void> => {
    const lineItem = findLineItemInCache(queryClient, lineItemId);
    if (!lineItem) return;

    const baseline = getManualLineItemBaseline(queryClient, lineItemId);
    if (!isManualLineItemOrigin(lineItem, baseline !== undefined)) return;

    const syncedToParser = isManualLineItemSyncedToParser(queryClient, lineItemId);

    await syncManualLineItem(lineItemId, buildManualLineItemSyncPayload(lineItem));

    if (!syncedToParser) {
      setManualLineItemSyncedToParser(queryClient, lineItemId);
    }
  };

  try {
    await performRetrySync();
  } catch (error) {
    const lineItem = findLineItemInCache(queryClient, lineItemId);
    if (!lineItem) return;

    console.error('Failed to retry manual line item sync to parser:', error);
    notifyManualSyncError({
      lineItemId,
      opportunityId: lineItem.opportunityId,
      message: syncErrorMessage(error),
      retry: () => retryManualLineItemSync(queryClient, lineItemId),
    });
  }
}

const performNewManualLineItemSync = async (
  queryClient: QueryClient,
  lineItemId: string,
  opportunityId: string,
): Promise<void> => {
  const lineItem: LineItemRow = {
    id: lineItemId,
    opportunityId,
    name: DEFAULT_MANUAL_LINE_ITEM_NAME,
    kolichestvo: 1,
    amount: { amountMicros: 0, currencyCode: 'RUB' },
    istochnik: LINE_ITEM_ORIGIN.TWENTY_MANUAL,
    stage: 'NOVYY',
  };

  await syncManualLineItem(lineItemId, buildManualLineItemSyncPayload(lineItem));
  setManualLineItemSyncedToParser(queryClient, lineItemId);
};

export async function syncNewManualLineItemToParser(
  queryClient: QueryClient,
  lineItemId: string,
  opportunityId: string,
): Promise<void> {
  try {
    await performNewManualLineItemSync(queryClient, lineItemId, opportunityId);
  } catch (error) {
    console.error('Failed to sync new manual line item to parser:', error);
    notifyManualSyncError({
      lineItemId,
      opportunityId,
      message: syncErrorMessage(error),
      retry: () => performNewManualLineItemSync(queryClient, lineItemId, opportunityId),
    });
  }
}

export async function maybeSyncManualLineItemToParser(params: {
  lineItem: LineItemRow;
  patch: Record<string, unknown>;
  baseline?: ManualLineItemBaseline;
  syncedToParser: boolean;
}): Promise<boolean> {
  const merged = { ...params.lineItem, ...params.patch };
  const snapshot = toSyncSnapshot(merged);
  const baseline = params.baseline ?? defaultManualLineItemBaseline();

  if (!params.syncedToParser && !isMeaningfulManualLineItemChange(baseline, snapshot)) {
    return false;
  }

  await syncManualLineItem(params.lineItem.id, buildManualLineItemSyncPayload(merged));
  return true;
}

export const syncManualLineItemAfterUpdate = async (
  queryClient: QueryClient,
  lineItemId: string,
  patch: Record<string, unknown>,
): Promise<void> => {
  const lineItem = findLineItemInCache(queryClient, lineItemId);

  if (!lineItem) return;

  const baseline = getManualLineItemBaseline(queryClient, lineItemId);
  if (!isManualLineItemOrigin(lineItem, baseline !== undefined)) return;

  const syncedToParser = isManualLineItemSyncedToParser(queryClient, lineItemId);
  const merged = mergeLineItemPatch(lineItem, patch);

  const performUpdateSync = async (): Promise<void> => {
    const didSync = await maybeSyncManualLineItemToParser({
      lineItem: merged,
      patch: {},
      baseline,
      syncedToParser,
    });

    if (didSync) {
      setManualLineItemSyncedToParser(queryClient, lineItemId);
    }
  };

  try {
    await performUpdateSync();
  } catch (error) {
    console.error('Failed to sync manual line item to parser:', error);
    notifyManualSyncError({
      lineItemId,
      opportunityId: lineItem.opportunityId,
      message: syncErrorMessage(error),
      retry: performUpdateSync,
    });
  }
};
