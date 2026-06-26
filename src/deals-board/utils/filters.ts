import type { LineItemStage } from 'src/constants/stages';

import { asStringArray } from './parse-json-field';

export const normalizeStageList = (value: unknown): LineItemStage[] =>
  asStringArray(value) as LineItemStage[];

export const mergeStageFilters = (
  fromView?: unknown,
  fromQuick?: unknown,
): LineItemStage[] | undefined => {
  const viewStages = normalizeStageList(fromView);
  const quickStages = normalizeStageList(fromQuick);

  if (!viewStages.length && !quickStages.length) {
    return undefined;
  }
  if (!viewStages.length) {
    return quickStages;
  }
  if (!quickStages.length) {
    return viewStages;
  }

  const quickSet = new Set(quickStages);
  return viewStages.filter((stage) => quickSet.has(stage));
};
