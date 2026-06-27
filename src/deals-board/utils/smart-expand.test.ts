import { describe, expect, it } from 'vitest';

import {
  computeIsExpanded,
  EMPTY_EXPAND_OVERRIDES,
  hasActiveLineItems,
  shouldAutoExpandDeal,
  toggleExpandOverride,
} from './smart-expand';

describe('hasActiveLineItems', () => {
  it('treats missing stage as active', () => {
    expect(hasActiveLineItems([{ stage: null }])).toBe(true);
    expect(hasActiveLineItems([{ stage: undefined }])).toBe(true);
  });

  it('ignores finished stages', () => {
    expect(hasActiveLineItems([{ stage: 'GOTOVO' }, { stage: 'OTMENA' }])).toBe(false);
  });

  it('detects in-progress stages', () => {
    expect(hasActiveLineItems([{ stage: 'V_RABOTE' }])).toBe(true);
  });
});

describe('shouldAutoExpandDeal', () => {
  it('auto-expands only in smart mode when active items exist', () => {
    const items = [{ stage: 'V_RABOTE' as const }];

    expect(shouldAutoExpandDeal(items, 'smart')).toBe(true);
    expect(shouldAutoExpandDeal(items, 'collapsed')).toBe(false);
    expect(shouldAutoExpandDeal([], 'smart')).toBe(false);
  });
});

describe('computeIsExpanded', () => {
  const activeItems = [{ stage: 'NOVYY' as const }];

  it('expands active deals in smart mode by default', () => {
    expect(computeIsExpanded('deal-1', activeItems, 'smart', EMPTY_EXPAND_OVERRIDES)).toBe(true);
  });

  it('respects manual collapse in smart mode', () => {
    const overrides = { collapsed: ['deal-1'], expanded: [] };

    expect(computeIsExpanded('deal-1', activeItems, 'smart', overrides)).toBe(false);
  });

  it('keeps deals collapsed until manually expanded', () => {
    expect(computeIsExpanded('deal-1', activeItems, 'collapsed', EMPTY_EXPAND_OVERRIDES)).toBe(false);

    const overrides = { collapsed: [], expanded: ['deal-1'] };
    expect(computeIsExpanded('deal-1', activeItems, 'collapsed', overrides)).toBe(true);
  });
});

describe('toggleExpandOverride', () => {
  const activeItems = [{ stage: 'NOVYY' as const }];

  it('remembers manual collapse in smart mode', () => {
    const next = toggleExpandOverride('deal-1', activeItems, 'smart', EMPTY_EXPAND_OVERRIDES);

    expect(next.collapsed).toEqual(['deal-1']);
    expect(computeIsExpanded('deal-1', activeItems, 'smart', next)).toBe(false);
  });

  it('restores smart auto-expand after second toggle', () => {
    const collapsed = toggleExpandOverride('deal-1', activeItems, 'smart', EMPTY_EXPAND_OVERRIDES);
    const restored = toggleExpandOverride('deal-1', activeItems, 'smart', collapsed);

    expect(restored.collapsed).toEqual([]);
    expect(computeIsExpanded('deal-1', activeItems, 'smart', restored)).toBe(true);
  });

  it('allows expanding fully completed deals in smart mode', () => {
    const doneItems = [{ stage: 'GOTOVO' as const }, { stage: 'OTMENA' as const }];
    expect(computeIsExpanded('deal-1', doneItems, 'smart', EMPTY_EXPAND_OVERRIDES)).toBe(false);

    const expanded = toggleExpandOverride('deal-1', doneItems, 'smart', EMPTY_EXPAND_OVERRIDES);
    expect(expanded.expanded).toEqual(['deal-1']);
    expect(computeIsExpanded('deal-1', doneItems, 'smart', expanded)).toBe(true);

    const collapsed = toggleExpandOverride('deal-1', doneItems, 'smart', expanded);
    expect(collapsed.expanded).toEqual([]);
    expect(computeIsExpanded('deal-1', doneItems, 'smart', collapsed)).toBe(false);
  });
});
