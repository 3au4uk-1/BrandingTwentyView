/** Objects the board renders, mapped to the react-query keys that hold their data. */
export const WATCHED_QUERY_KEYS = {
  opportunity: ['opportunities', 'deals-board-page'],
  dealLineItem: ['lineItems', 'deals-board-page'],
  okleykaDealShare: ['okleyka-shares', 'okleyka-salary'],
  okleykaSalaryEntry: ['okleyka-salary-entries', 'okleyka-salary', 'okleyka-salary-history'],
  company: ['companyNames'],
  restorationTemplate: ['restorationTemplatesCatalog'],
  bannerCrewSlot: ['banner-crew-slots'],
} as const satisfies Record<string, readonly string[]>;

export type WatchedObjectName = keyof typeof WATCHED_QUERY_KEYS;

export const WATCHED_OBJECT_NAMES = Object.keys(WATCHED_QUERY_KEYS) as WatchedObjectName[];

export const ALL_WATCHED_QUERY_KEYS = [
  ...new Set(Object.values(WATCHED_QUERY_KEYS).flat()),
];

/** Only these two have row caches we can patch in place; the rest are refetched. */
export const PATCHABLE_OBJECT_NAMES = ['opportunity', 'dealLineItem'] as const;
