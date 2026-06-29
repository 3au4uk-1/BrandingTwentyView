export const DEALS_BOARD_SSE_QUERY_IDS = {
  opportunity: 'deals-board-opportunities',
  dealLineItem: 'deals-board-line-items',
} as const;

export const WATCHED_OBJECT_NAMES = ['opportunity', 'dealLineItem'] as const;

export type WatchedObjectName = (typeof WATCHED_OBJECT_NAMES)[number];
