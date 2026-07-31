export const shouldEnableAggregateColdLoad = (params: {
  useAggregateColdPath: boolean;
  viewsIsError: boolean;
  /** Opportunity field descriptors loaded — avoids page POSTs with empty visible columns. */
  parentFieldsReady: boolean;
  /**
   * Views list query finished (do not wait for isSeedingDefault).
   * Prevents a provisional-sort fetch flipping when the real view arrives.
   */
  viewsReady: boolean;
}): boolean =>
  params.useAggregateColdPath &&
  !params.viewsIsError &&
  params.parentFieldsReady &&
  params.viewsReady;

export const provisionalAggregateViewId = (activeViewId: string | undefined): string =>
  activeViewId ?? 'provisional-future';
