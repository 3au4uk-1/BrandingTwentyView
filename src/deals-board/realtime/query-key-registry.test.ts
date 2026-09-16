import { describe, expect, it } from 'vitest';

import {
  ALL_WATCHED_QUERY_KEYS,
  PATCHABLE_OBJECT_NAMES,
  WATCHED_OBJECT_NAMES,
  WATCHED_QUERY_KEYS,
} from './query-key-registry';

describe('query key registry', () => {
  it('covers every object the board renders', () => {
    expect(WATCHED_OBJECT_NAMES).toEqual([
      'opportunity',
      'dealLineItem',
      'okleykaDealShare',
      'okleykaSalaryEntry',
      'company',
      'restorationTemplate',
      'bannerCrewSlot',
    ]);
  });

  it('maps objects to the query keys the board actually uses', () => {
    expect(WATCHED_QUERY_KEYS.opportunity).toEqual(['opportunities', 'deals-board-page']);
    expect(WATCHED_QUERY_KEYS.dealLineItem).toEqual(['lineItems', 'deals-board-page']);
    expect(WATCHED_QUERY_KEYS.okleykaDealShare).toEqual(['okleyka-shares', 'okleyka-salary']);
    expect(WATCHED_QUERY_KEYS.okleykaSalaryEntry).toEqual([
      'okleyka-salary-entries',
      'okleyka-salary',
      'okleyka-salary-history',
    ]);
    expect(WATCHED_QUERY_KEYS.company).toEqual(['companyNames']);
    expect(WATCHED_QUERY_KEYS.restorationTemplate).toEqual(['restorationTemplatesCatalog']);
    expect(WATCHED_QUERY_KEYS.bannerCrewSlot).toEqual(['banner-crew-slots']);
  });

  it('exposes a deduplicated flat list for full resyncs', () => {
    expect(ALL_WATCHED_QUERY_KEYS).toEqual([
      'opportunities',
      'deals-board-page',
      'lineItems',
      'okleyka-shares',
      'okleyka-salary',
      'okleyka-salary-entries',
      'okleyka-salary-history',
      'companyNames',
      'restorationTemplatesCatalog',
      'banner-crew-slots',
    ]);
  });

  it('only allows cache patching for objects with row caches', () => {
    expect(PATCHABLE_OBJECT_NAMES).toEqual(['opportunity', 'dealLineItem']);
  });
});
