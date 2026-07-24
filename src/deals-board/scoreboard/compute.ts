import { LINE_ITEM_TYPES, type LineItemType } from 'src/constants/line-item-types';
import { LINE_ITEM_STAGES, type LineItemStage } from 'src/constants/stages';

import type { LineItemRow } from '../types';

export type MetricCount = {
  positions: number;
  deals: number;
};

export type ProductionScoreboardStats = {
  totalPositions: number;
  totalDeals: number;
  byTip: Record<LineItemType, MetricCount>;
  byStage: Record<LineItemStage, MetricCount>;
};

const emptyCount = (): MetricCount => ({ positions: 0, deals: 0 });

const bump = (
  map: Record<string, MetricCount>,
  key: string,
  opportunityId: string,
  seenDeals: Map<string, Set<string>>,
) => {
  if (!map[key]) map[key] = emptyCount();
  map[key].positions += 1;
  let dealSet = seenDeals.get(key);
  if (!dealSet) {
    dealSet = new Set();
    seenDeals.set(key, dealSet);
  }
  if (opportunityId && !dealSet.has(opportunityId)) {
    dealSet.add(opportunityId);
    map[key].deals += 1;
  }
};

/** Primary tip chips (NE_NASHE only shown when count > 0). */
export const SCOREBOARD_TIP_ORDER: LineItemType[] = [
  'BANNERA',
  'PLENKA',
  'PODRYAD',
  'PROIZVODSTVO',
  'RESTAVRACIYA',
];

export const SCOREBOARD_STAGE_ORDER: LineItemStage[] = LINE_ITEM_STAGES.map((s) => s.value);

export const computeProductionScoreboard = (
  lineItems: LineItemRow[],
): ProductionScoreboardStats => {
  const byTip = Object.fromEntries(
    LINE_ITEM_TYPES.map((t) => [t.value, emptyCount()]),
  ) as Record<LineItemType, MetricCount>;
  const byStage = Object.fromEntries(
    LINE_ITEM_STAGES.map((s) => [s.value, emptyCount()]),
  ) as Record<LineItemStage, MetricCount>;

  const tipDeals = new Map<string, Set<string>>();
  const stageDeals = new Map<string, Set<string>>();
  const allDeals = new Set<string>();

  for (const item of lineItems) {
    const oppId = item.opportunityId || '';
    if (oppId) allDeals.add(oppId);

    if (item.tip && item.tip in byTip) {
      bump(byTip, item.tip, oppId, tipDeals);
    }
    if (item.stage && item.stage in byStage) {
      bump(byStage, item.stage, oppId, stageDeals);
    }
  }

  return {
    totalPositions: lineItems.length,
    totalDeals: allDeals.size,
    byTip,
    byStage,
  };
};

export const computeTipStageBreakdown = (
  lineItems: LineItemRow[],
  tip: LineItemType,
): Record<LineItemStage, MetricCount> => {
  const byStage = Object.fromEntries(
    LINE_ITEM_STAGES.map((s) => [s.value, emptyCount()]),
  ) as Record<LineItemStage, MetricCount>;
  const stageDeals = new Map<string, Set<string>>();

  for (const item of lineItems) {
    if (item.tip !== tip) continue;
    if (!item.stage || !(item.stage in byStage)) continue;
    bump(byStage, item.stage, item.opportunityId || '', stageDeals);
  }

  return byStage;
};
