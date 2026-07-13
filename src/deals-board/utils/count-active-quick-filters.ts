import type { QuickFiltersValue } from '../QuickFiltersBar';

export const countActiveQuickFilters = (value: QuickFiltersValue): number => {
  let count = 0;
  if (value.datePreset) count += 1;
  if ((value.stages ?? []).length > 0) count += 1;
  if ((value.types ?? []).length > 0) count += 1;
  if ((value.companyIds ?? []).length > 0) count += 1;
  if (value.oplata && value.oplata !== 'all') count += 1;
  if (value.search.trim().length > 0) count += 1;
  return count;
};
