import type { LineItemRowLike } from './deals-board-page-types';

export type { DealsBoardPageRequest, DealsBoardPageResponse, LineItemRowLike } from './deals-board-page-types';

export const MAX_LIST_STATUS_BATCH_IDS = 500;

const DEFAULT_FIELD_TYPES_BY_NAME: Readonly<Record<string, string>> = { amount: 'CURRENCY' };

export const resolveFieldTypesByName = (
  fieldTypesByName?: Record<string, string>,
): Record<string, string> => {
  if (!fieldTypesByName || Object.keys(fieldTypesByName).length === 0) {
    return { ...DEFAULT_FIELD_TYPES_BY_NAME };
  }
  return fieldTypesByName;
};

export const capLineItemIdsForListStatus = (ids: string[]): string[] =>
  ids.slice(0, MAX_LIST_STATUS_BATCH_IDS);

const TIMEOUT_LIKE_CODES = new Set(['ETIMEDOUT', 'ECONNABORTED', 'UND_ERR_CONNECT_TIMEOUT']);

const isTimeoutLikeError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;

  const record = error as { name?: unknown; code?: unknown; message?: unknown };
  if (record.name === 'AbortError') return true;
  if (typeof record.code === 'string' && TIMEOUT_LIKE_CODES.has(record.code)) return true;
  if (typeof record.message === 'string' && /timeout/i.test(record.message)) return true;

  return false;
};

const isNetworkLikeError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;

  const record = error as { name?: unknown; code?: unknown; message?: unknown };
  if (record.name === 'TypeError') return true;
  if (typeof record.code === 'string' && /^(ECONNREFUSED|ENOTFOUND|ECONNRESET|EAI_AGAIN)$/.test(record.code)) {
    return true;
  }
  if (typeof record.message === 'string' && /(fetch failed|network)/i.test(record.message)) {
    return true;
  }

  return false;
};

const getErrorStatus = (error: unknown): number | undefined => {
  if (!error || typeof error !== 'object') return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
};

export const groupLineItemsByOpportunityId = <T extends LineItemRowLike>(
  items: T[],
): Record<string, T[]> => {
  const grouped: Record<string, T[]> = {};

  for (const item of items) {
    const bucket = grouped[item.opportunityId];
    if (bucket) {
      bucket.push(item);
    } else {
      grouped[item.opportunityId] = [item];
    }
  }

  return grouped;
};

const isNotConfiguredError = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') return false;

  const record = error as { code?: unknown; message?: unknown };
  if (record.code === 'NOT_CONFIGURED') return true;
  if (typeof record.message === 'string' && /not configured/i.test(record.message)) return true;

  return false;
};

export const shouldUseDealsBoardPageFallback = (error: unknown): boolean => {
  if (isNotConfiguredError(error)) return true;

  const status = getErrorStatus(error);
  if (typeof status === 'number') {
    if (status === 404) return true;
    return status >= 500;
  }

  return isTimeoutLikeError(error) || isNetworkLikeError(error);
};

export const formatDealsBoardPageFailure = (
  error: unknown,
): { error: string; cause?: string } => {
  const message = error instanceof Error ? error.message : 'deals-board page failed';
  if (/fetch failed/i.test(message)) {
    return { error: message, cause: 'network' };
  }
  return { error: message };
};
