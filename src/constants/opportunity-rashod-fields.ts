/** Opportunity expense fields always fetched for margin analytics. */
export const OPPORTUNITY_RASHOD_REST_FIELDS = [
  'rashodItogo',
  'rashodPechat',
  'rashodFrezerovka',
  'rashodLogistika',
  'rashodVyezdnayaKomanda',
  'rashodBeznal',
  'rashodSyncedAt',
] as const;

export type OpportunityRashodRestField = (typeof OPPORTUNITY_RASHOD_REST_FIELDS)[number];
