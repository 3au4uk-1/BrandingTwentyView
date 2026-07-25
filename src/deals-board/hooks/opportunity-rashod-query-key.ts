export const buildOpportunityRashodQueryKey = (
  ids: readonly string[],
): readonly ['opportunity-rashod', string] =>
  ['opportunity-rashod', [...ids].sort().join(',')] as const;
