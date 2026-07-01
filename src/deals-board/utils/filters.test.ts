import { describe, expect, it } from 'vitest';

import { mergeCompanyFilters, mergeTypeFilters } from './filters';

describe('mergeCompanyFilters', () => {
  it('returns undefined when both sources are empty', () => {
    expect(mergeCompanyFilters([], [])).toBeUndefined();
  });

  it('returns quick filter when view filter is empty', () => {
    expect(mergeCompanyFilters([], ['company-1'])).toEqual(['company-1']);
  });

  it('intersects view and quick company filters', () => {
    expect(
      mergeCompanyFilters(['company-1', 'company-2'], ['company-2', 'company-3']),
    ).toEqual(['company-2']);
  });
});

describe('mergeTypeFilters', () => {
  it('returns undefined when both sources are empty', () => {
    expect(mergeTypeFilters([], [])).toBeUndefined();
  });

  it('returns quick filter when view filter is empty', () => {
    expect(mergeTypeFilters([], ['BANNERA'])).toEqual(['BANNERA']);
  });

  it('intersects view and quick type filters', () => {
    expect(mergeTypeFilters(['BANNERA', 'PLENKA'], ['PLENKA'])).toEqual(['PLENKA']);
  });
});
