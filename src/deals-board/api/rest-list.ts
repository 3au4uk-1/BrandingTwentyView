/**
 * Twenty REST list endpoints may return either:
 * - `{ data: [...] }` (flat array)
 * - `{ data: { [collectionKey]: [...] }, pageInfo, totalCount }` (OpenAPI shape)
 */
export const normalizeRestListResponse = <T>(
  response: unknown,
  collectionKey: string,
): T[] => {
  if (Array.isArray(response)) {
    return response;
  }

  if (!response || typeof response !== 'object') {
    return [];
  }

  const body = response as Record<string, unknown>;
  const data = body.data;

  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === 'object') {
    const nested = (data as Record<string, unknown>)[collectionKey];
    if (Array.isArray(nested)) {
      return nested as T[];
    }
  }

  const topLevel = body[collectionKey];
  if (Array.isArray(topLevel)) {
    return topLevel as T[];
  }

  return [];
};

export type RestPageInfo = {
  hasNextPage?: boolean;
  endCursor?: string | null;
};

export const extractRestPageInfo = (response: unknown): RestPageInfo => {
  if (!response || typeof response !== 'object') return {};

  const pageInfo = (response as Record<string, unknown>).pageInfo;
  if (!pageInfo || typeof pageInfo !== 'object') return {};

  return pageInfo as RestPageInfo;
};

/**
 * Next cursor for REST list pagination. Returns undefined when pagination should stop,
 * including when Twenty reports hasNextPage but endCursor did not advance (infinite loop).
 */
export const resolveNextRestCursor = (
  previousCursor: string | undefined,
  pageInfo: RestPageInfo,
): string | undefined => {
  if (!pageInfo.hasNextPage || pageInfo.endCursor == null || pageInfo.endCursor === '') {
    return undefined;
  }
  const next = String(pageInfo.endCursor);
  if (previousCursor !== undefined && next === previousCursor) {
    return undefined;
  }
  return next;
};
