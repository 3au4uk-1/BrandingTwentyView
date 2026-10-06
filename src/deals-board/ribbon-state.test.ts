import { describe, expect, it } from 'vitest';

import {
  isDisplayTabDirty,
  isLabelsTabAvailable,
  isLabelsTabDirty,
  resolveOpenRibbonTab,
  toggleRibbonTab,
} from './ribbon-state';

describe('toggleRibbonTab', () => {
  it('opens a closed tab', () => {
    expect(toggleRibbonTab(null, 'display')).toBe('display');
  });

  it('closes the active tab', () => {
    expect(toggleRibbonTab('labels', 'labels')).toBeNull();
  });

  it('switches to another tab', () => {
    expect(toggleRibbonTab('display', 'board')).toBe('board');
  });
});

describe('ribbon dots', () => {
  it('marks display dirty when any control leaves its default', () => {
    const clean = {
      expandMode: 'smart' as const,
      typeSectionsEnabled: false,
      groupChipMode: 'name+status' as const,
    };
    expect(isDisplayTabDirty(clean)).toBe(false);
    expect(isDisplayTabDirty({ ...clean, expandMode: 'collapsed' })).toBe(true);
    expect(isDisplayTabDirty({ ...clean, typeSectionsEnabled: true })).toBe(true);
    expect(isDisplayTabDirty({ ...clean, groupChipMode: 'name' })).toBe(true);
  });

  it('marks labels dirty only when something is hidden', () => {
    expect(isLabelsTabDirty(0)).toBe(false);
    expect(isLabelsTabDirty(1)).toBe(true);
  });
});

describe('labels tab availability', () => {
  it('requires a configured parser and at least one label', () => {
    expect(isLabelsTabAvailable(4, true)).toBe(true);
    expect(isLabelsTabAvailable(0, true)).toBe(false);
    expect(isLabelsTabAvailable(4, false)).toBe(false);
  });

  it('closes the labels tab when it is no longer available', () => {
    expect(resolveOpenRibbonTab('labels', false)).toBeNull();
    expect(resolveOpenRibbonTab('labels', true)).toBe('labels');
    expect(resolveOpenRibbonTab('board', false)).toBe('board');
  });
});
