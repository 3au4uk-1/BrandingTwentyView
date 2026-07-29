import type { LineItemType } from 'src/constants/line-item-types';
import type { LineItemStage } from 'src/constants/stages';

import type { LineItemRow, OpportunityRow } from '../types';
import { toLocalInputDate } from '../utils/date-filters';
import { workingDaysUntil } from '../utils/working-days';

const IDLE_STAGES = new Set<LineItemStage>(['NOVYY', 'GOTOVO', 'OTMENA']);

export const ATTENTION_WINDOW_BY_TIP: Partial<Record<LineItemType, number>> = {
  PROIZVODSTVO: 4,
  BANNERA: 4,
  PODRYAD: 4,
  PLENKA: 3,
  RESTAVRACIYA: 3,
};

export const ATTENTION_TIP_ORDER: LineItemType[] = [
  'BANNERA',
  'PLENKA',
  'PODRYAD',
  'PROIZVODSTVO',
  'RESTAVRACIYA',
];

export type AttentionItem = {
  lineItemId: string;
  opportunityId: string;
  tip: LineItemType;
  workingDaysUntil: number;
};

export type AttentionStats = {
  total: number;
  byTip: Partial<Record<LineItemType, number>>;
  items: AttentionItem[];
  lineItemIds: Set<string>;
  opportunityIds: Set<string>;
};

export const isAttentionEligible = (
  tip: string | null | undefined,
  stage: string | null | undefined,
  daysUntil: number,
): tip is LineItemType => {
  if (!tip || !(tip in ATTENTION_WINDOW_BY_TIP)) return false;
  if (!stage || IDLE_STAGES.has(stage as LineItemStage)) return false;
  const window = ATTENTION_WINDOW_BY_TIP[tip as LineItemType];
  if (typeof window !== 'number') return false;
  return daysUntil <= window;
};

export const computeAttention = (
  todayInput: string,
  lineItems: LineItemRow[],
  opportunitiesById: Map<string, Pick<OpportunityRow, 'id' | 'loadDate'>>,
): AttentionStats => {
  const items: AttentionItem[] = [];
  const byTip: Partial<Record<LineItemType, number>> = {};
  const lineItemIds = new Set<string>();
  const opportunityIds = new Set<string>();

  for (const item of lineItems) {
    const opp = opportunitiesById.get(item.opportunityId);
    if (!opp?.loadDate) continue;
    const eventDay = toLocalInputDate(opp.loadDate);
    if (!eventDay) continue;

    const days = workingDaysUntil(todayInput, eventDay);
    if (!isAttentionEligible(item.tip, item.stage, days)) continue;
    if (!item.tip) continue;

    const tip = item.tip as LineItemType;
    items.push({
      lineItemId: item.id,
      opportunityId: item.opportunityId,
      tip,
      workingDaysUntil: days,
    });
    byTip[tip] = (byTip[tip] ?? 0) + 1;
    lineItemIds.add(item.id);
    opportunityIds.add(item.opportunityId);
  }

  return {
    total: items.length,
    byTip,
    items,
    lineItemIds,
    opportunityIds,
  };
};
