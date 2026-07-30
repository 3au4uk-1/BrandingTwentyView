export type DealsBoardPageRequest = {
  limit: number;
  offset: number;
  /** Pre-built GraphQL filter object from client `buildOpportunityFilter` path */
  opportunityFilter?: Record<string, unknown>;
  orderBy: Array<Record<string, string>>;
  visibleCrmFieldNames: string[];
  includeCompanyRelation: boolean;
  restFieldNames: string[];
  includeListStatus: boolean;
  /** CRM field type map for GraphQL node selection (e.g. `{ amount: 'CURRENCY' }`) */
  fieldTypesByName?: Record<string, string>;
  /** When true, response includes `_timings` stage durations (not shown in UI) */
  debug?: boolean;
};

export type DealsBoardPageResponse = {
  opportunities: Array<Record<string, unknown>>;
  totalCount: number;
  lineItemsByOppId: Record<string, Array<Record<string, unknown>>>;
  listStatusByLineItemId?: Record<string, unknown>;
  _timings?: {
    gqlMs: number;
    enrichMs: number;
    lineItemsMs: number;
    totalMs: number;
  };
};

export type LineItemRowLike = {
  id: string;
  opportunityId: string;
};
