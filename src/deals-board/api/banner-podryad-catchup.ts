import type { QueryClient } from '@tanstack/react-query';

import {
  findLineItemOpportunityId,
  findOpportunityInCache,
} from '../utils/opportunity-cache';

import { notifyBannerPodryadCatchup } from './crmparser';

export const fireBannerPodryadCatchupNotify = (
  queryClient: QueryClient,
  lineItemId: string,
): void => {
  const opportunityId = findLineItemOpportunityId(queryClient, lineItemId);
  const opportunity = opportunityId
    ? findOpportunityInCache(queryClient, opportunityId)
    : undefined;
  const loadDate =
    typeof opportunity?.loadDate === 'string' && opportunity.loadDate.trim()
      ? opportunity.loadDate
      : undefined;

  void notifyBannerPodryadCatchup({
    lineItemId,
    ...(opportunityId ? { opportunityId } : {}),
    ...(loadDate ? { loadDate } : {}),
  }).catch(() => {});
};
