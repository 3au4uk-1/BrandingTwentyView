import type { LineItemStage } from 'src/constants/stages';
import type { LineItemType } from 'src/constants/line-item-types';

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

export const normalizeTypeList = (value: unknown): LineItemType[] =>
  asStringArray(value) as LineItemType[];

export const mergeTypeFilters = (
  fromView?: unknown,
  fromQuick?: unknown,
): LineItemType[] | undefined => {
  const viewTypes = normalizeTypeList(fromView);
  const quickTypes = normalizeTypeList(fromQuick);

  if (!viewTypes.length && !quickTypes.length) {
    return undefined;
  }
  if (!viewTypes.length) {
    return quickTypes;
  }
  if (!quickTypes.length) {
    return viewTypes;
  }

  const quickSet = new Set(quickTypes);
  return viewTypes.filter((type) => quickSet.has(type));
};

export const normalizeCompanyIdList = (value: unknown): string[] => asStringArray(value);

export const mergeCompanyFilters = (
  fromView?: unknown,
  fromQuick?: unknown,
): string[] | undefined => {
  const viewCompanyIds = normalizeCompanyIdList(fromView);
  const quickCompanyIds = normalizeCompanyIdList(fromQuick);

  if (!viewCompanyIds.length && !quickCompanyIds.length) {
    return undefined;
  }
  if (!viewCompanyIds.length) {
    return quickCompanyIds;
  }
  if (!quickCompanyIds.length) {
    return viewCompanyIds;
  }

  const quickSet = new Set(quickCompanyIds);
  return viewCompanyIds.filter((id) => quickSet.has(id));
};
