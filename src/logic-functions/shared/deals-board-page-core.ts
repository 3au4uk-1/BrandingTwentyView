import type { LineItemRowLike } from './deals-board-page-types';

export type { DealsBoardPageRequest, DealsBoardPageResponse, LineItemRowLike } from './deals-board-page-types';

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

export const shouldUseDealsBoardPageFallback = (error: unknown): boolean => {
  const status = getErrorStatus(error);
  if (typeof status === 'number') {
    return status >= 500;
  }

  return isTimeoutLikeError(error) || isNetworkLikeError(error);
};
