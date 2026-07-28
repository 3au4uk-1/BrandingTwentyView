import type { QueryClient } from '@tanstack/react-query';

import { updateLineItem } from '../api/line-items';
import type { LineItemRow, OpportunityRow } from '../types';
import { planBrandingFreeNameRename } from './branding-free-name';
import { planHvataykaAutomation } from './hvatayka';
import { planRestorationMaketAuto } from './restoration-maket';
import { planTipFromName } from './tip-from-name';
import { notifyOkleykaMessage } from '../utils/okleyka-message-notify';

type OpportunitiesPage = {
  records: OpportunityRow[];
};

const HVATAYKA_TRIGGER_FIELDS = new Set(['name', 'tip', 'stage', 'tipDetail', 'kommentariy']);

const findLineItemInCache = (
  queryClient: QueryClient,
  id: string,
): LineItemRow | undefined => {
  for (const [, items] of queryClient.getQueriesData<LineItemRow[]>({
    queryKey: ['lineItems'],
  })) {
    const match = items?.find((item) => item.id === id);
    if (match) return match;
  }
  return undefined;
};

const findSiblingsInCache = (
  queryClient: QueryClient,
  opportunityId: string,
): LineItemRow[] => {
  const byId = new Map<string, LineItemRow>();

  for (const [, items] of queryClient.getQueriesData<LineItemRow[]>({
    queryKey: ['lineItems'],
  })) {
    for (const item of items ?? []) {
      if (item.opportunityId === opportunityId) {
        byId.set(item.id, item);
      }
    }
  }

  return [...byId.values()];
};

const findOpportunityInCache = (
  queryClient: QueryClient,
  opportunityId: string,
): OpportunityRow | undefined => {
  for (const [, page] of queryClient.getQueriesData<OpportunitiesPage>({
    queryKey: ['opportunities'],
  })) {
    const match = page?.records?.find((record) => record.id === opportunityId);
    if (match) return match;
  }
  return undefined;
};

const patchCaches = (
  queryClient: QueryClient,
  id: string,
  data: Record<string, unknown>,
): void => {
  for (const [queryKey, items] of queryClient.getQueriesData<LineItemRow[]>({
    queryKey: ['lineItems'],
  })) {
    if (!items) continue;
    queryClient.setQueryData<LineItemRow[]>(
      queryKey,
      items.map((item) => (item.id === id ? { ...item, ...data } : item)),
    );
  }
};

const applyFollowUpPatch = async (
  queryClient: QueryClient,
  id: string,
  data: Record<string, unknown>,
): Promise<void> => {
  await updateLineItem(id, data);
  patchCaches(queryClient, id, data);
};

export type RunAfterLineItemUpdateArgs = {
  id: string;
  patch: Record<string, unknown>;
  /** Item state before this user patch (from onMutate). */
  previousItem?: LineItemRow;
};

/**
 * Side-effects after a successful line-item save: name→tip, hvatayka,
 * branding rename, OKLEYKA toast, restoration maket auto-fill.
 */
export const runAfterLineItemUpdate = async (
  queryClient: QueryClient,
  { id, patch, previousItem }: RunAfterLineItemUpdateArgs,
): Promise<void> => {
  const current =
    findLineItemInCache(queryClient, id) ??
    (previousItem ? { ...previousItem, ...patch } : undefined);

  if (!current?.opportunityId) return;

  const opportunityId = current.opportunityId;
  const tipBeforeNameInfer = previousItem?.tip ?? current.tip;

  // 1) Branding free-entry rename (once)
  if ('kommentariy' in patch) {
    const kommentariy =
      typeof patch.kommentariy === 'string'
        ? patch.kommentariy
        : current.kommentariy;
    const nameBefore =
      previousItem?.name ??
      (typeof patch.name === 'string' ? undefined : current.name);
    const nextName = planBrandingFreeNameRename(
      nameBefore ?? current.name,
      kommentariy,
    );
    if (nextName && nextName !== current.name) {
      await applyFollowUpPatch(queryClient, id, { name: nextName });
      current.name = nextName;
    }
  }

  // 2) Name → tip (always overwrite when keyword matches)
  const nameChanged =
    'name' in patch ||
    (typeof current.name === 'string' &&
      previousItem?.name !== undefined &&
      current.name !== previousItem.name);
  if (nameChanged || 'kommentariy' in patch) {
    const tipPlan = planTipFromName(current.name, current.tip);
    if (tipPlan) {
      await applyFollowUpPatch(queryClient, id, tipPlan);
      current.tip = tipPlan.tip;
    }
  }

  // 3) OKLEYKA message
  if (
    patch.stage === 'OKLEYKA' &&
    previousItem?.stage !== 'OKLEYKA'
  ) {
    const opportunity = findOpportunityInCache(queryClient, opportunityId);
    if (opportunity) {
      notifyOkleykaMessage({
        opportunityId,
        lineItemId: id,
        opportunity: {
          id: opportunity.id,
          name: opportunity.name,
          loadDate: opportunity.loadDate,
        },
        lineItem: current,
      });
    }
  }

  // 4) Restoration default maket when tip → RESTAVRACIYA
  const tipJustChanged =
    'tip' in patch ||
    (current.tip !== undefined && current.tip !== tipBeforeNameInfer);
  if (tipJustChanged) {
    const nextTip =
      typeof current.tip === 'string' || current.tip === null
        ? current.tip
        : null;
    const plan = planRestorationMaketAuto(
      tipBeforeNameInfer,
      nextTip,
      current.ssylkaNaMakety,
      { lineItemName: current.name },
    );
    if (plan) {
      await applyFollowUpPatch(queryClient, id, plan);
      current.ssylkaNaMakety = plan.ssylkaNaMakety;
    }
  }

  // 5) Hvatayka → GOTOVO
  const touchedHvatayka = Object.keys(patch).some((key) =>
    HVATAYKA_TRIGGER_FIELDS.has(key),
  ) || nameChanged;
  if (!touchedHvatayka) return;

  const siblings = findSiblingsInCache(queryClient, opportunityId).map((item) =>
    item.id === id ? { ...item, ...current } : item,
  );

  // Ensure current is present even if filters hid siblings
  if (!siblings.some((item) => item.id === id)) {
    siblings.push(current);
  }

  const plans = planHvataykaAutomation(siblings);
  for (const plan of plans) {
    if (plan.id === id) {
      const alreadyApplied =
        current.stage === plan.data.stage &&
        (current.kommentariy || '').trim() === plan.data.kommentariy;
      if (alreadyApplied) continue;
    }
    await applyFollowUpPatch(queryClient, plan.id, plan.data);
  }
};
