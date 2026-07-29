import type { QueryClient } from '@tanstack/react-query';

import { fetchLineItemsByOpportunityIds } from '../api/line-items';
import { patchOpportunity } from '../api/opportunities';
import { notifyDealCancelled } from './cancel-otmena-notify';
import { computeDealStage } from './compute-deal-stage';
import {
  findOpportunityInCache,
  patchOpportunityInCache,
} from './opportunity-cache';
import { isOtmenaTransition } from './otmena-transition';

export { findOpportunityInCache } from './opportunity-cache';

export const syncDealStage = async (
  queryClient: QueryClient,
  opportunityId: string,
): Promise<void> => {
  const opportunity = findOpportunityInCache(queryClient, opportunityId);
  if (!opportunity || opportunity.stageZakreplen === true) return;

  const lineItems = await fetchLineItemsByOpportunityIds([opportunityId]);
  const previousStage = typeof opportunity.stage === 'string' ? opportunity.stage : null;
  const nextStage = computeDealStage(lineItems);
  if (nextStage === opportunity.stage) return;

  await patchOpportunity(opportunityId, { stage: nextStage });

  patchOpportunityInCache(queryClient, opportunityId, { stage: nextStage });

  if (isOtmenaTransition(previousStage, nextStage)) {
    notifyDealCancelled();
  }
};
