import { describe, expect, it } from 'vitest';

import type { QuickFiltersValue } from '../QuickFiltersBar';
import { countActiveQuickFilters } from './count-active-quick-filters';

const EMPTY: QuickFiltersValue = {
  datePreset: null,
  stages: [],
  types: [],
  companyIds: [],
  oplata: 'all',
  search: '',
};

describe('countActiveQuickFilters', () => {
  it('returns 0 for defaults', () => {
    expect(countActiveQuickFilters(EMPTY)).toBe(0);
  });

  it('counts date preset, stages, types, companies, oplata, search', () => {
    expect(
      countActiveQuickFilters({
        ...EMPTY,
        datePreset: 'today',
        stages: ['V_PECHATI'],
        types: ['BANNERA'],
        companyIds: ['c1'],
        oplata: 'filled',
        search: 'test',
      }),
    ).toBe(6);
  });

  it('ignores whitespace-only search', () => {
    expect(countActiveQuickFilters({ ...EMPTY, search: '   ' })).toBe(0);
  });
});
