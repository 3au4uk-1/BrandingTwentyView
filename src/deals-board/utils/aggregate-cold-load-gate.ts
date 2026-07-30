export const shouldEnableAggregateColdLoad = (params: {
  useAggregateColdPath: boolean;
  viewsIsError: boolean;
}): boolean => params.useAggregateColdPath && !params.viewsIsError;

export const provisionalAggregateViewId = (activeViewId: string | undefined): string =>
  activeViewId ?? 'provisional-future';
