import type { LineItemListStatus } from '../api/crmparser';

export const countRestorationMatches = (
  statuses: Array<LineItemListStatus | null | undefined>,
): number => statuses.reduce((n, s) => n + (s?.restorationMatch ? 1 : 0), 0);
