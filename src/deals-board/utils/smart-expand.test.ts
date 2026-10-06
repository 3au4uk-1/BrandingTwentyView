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

  it('does not auto-expand cancelled opportunities', () => {
    const items = [{ stage: 'V_RABOTE' as const }];

    expect(shouldAutoExpandDeal(items, 'smart', 'OTMENA')).toBe(false);
  });

  it('does not auto-expand duplicate opportunities', () => {
    const items = [{ stage: 'V_RABOTE' as const }];

    expect(shouldAutoExpandDeal(items, 'smart', 'DUBL')).toBe(false);
  });

  it('does not auto-expand done (GOTOVO) opportunities', () => {
    const items = [{ stage: 'V_RABOTE' as const }];

    expect(shouldAutoExpandDeal(items, 'smart', 'GOTOVO')).toBe(false);
  });
});

describe('computeIsExpanded', () => {
  const activeItems = [{ stage: 'NOVYY' as const }];

  it('expands active deals in smart mode by default', () => {
    expect(computeIsExpanded('deal-1', activeItems, 'smart', EMPTY_EXPAND_OVERRIDES)).toBe(true);
  });

  it('keeps cancelled opportunities collapsed in smart mode', () => {
    expect(
      computeIsExpanded('deal-1', activeItems, 'smart', EMPTY_EXPAND_OVERRIDES, 'OTMENA'),
    ).toBe(false);
  });

  it('keeps duplicate opportunities collapsed in smart mode', () => {
    expect(
      computeIsExpanded('deal-1', activeItems, 'smart', EMPTY_EXPAND_OVERRIDES, 'DUBL'),
    ).toBe(false);
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

  it('allows an empty deal to be manually expanded', () => {
    const overrides = { collapsed: [], expanded: ['deal-1'] };

    expect(computeIsExpanded('deal-1', [], 'smart', overrides)).toBe(true);
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
    expect(
      computeIsExpanded('deal-1', doneItems, 'smart', EMPTY_EXPAND_OVERRIDES, 'GOTOVO'),
    ).toBe(false);

    const expanded = toggleExpandOverride(
      'deal-1',
      doneItems,
      'smart',
      EMPTY_EXPAND_OVERRIDES,
      'GOTOVO',
    );
    expect(expanded.expanded).toEqual(['deal-1']);
    expect(computeIsExpanded('deal-1', doneItems, 'smart', expanded, 'GOTOVO')).toBe(true);

    const collapsed = toggleExpandOverride('deal-1', doneItems, 'smart', expanded, 'GOTOVO');
    expect(collapsed.expanded).toEqual([]);
    expect(computeIsExpanded('deal-1', doneItems, 'smart', collapsed, 'GOTOVO')).toBe(false);
  });

  it('auto-expands deals with only done line items when opportunity is still active', () => {
    const doneItems = [{ stage: 'GOTOVO' as const }];
    expect(computeIsExpanded('deal-1', doneItems, 'smart', EMPTY_EXPAND_OVERRIDES, 'NOVYY')).toBe(
      true,
    );
  });

  it('allows manually expanding cancelled opportunities in smart mode', () => {
    const activeItems = [{ stage: 'V_RABOTE' as const }];
    expect(
      computeIsExpanded('deal-1', activeItems, 'smart', EMPTY_EXPAND_OVERRIDES, 'OTMENA'),
    ).toBe(false);

    const expanded = toggleExpandOverride(
      'deal-1',
      activeItems,
      'smart',
      EMPTY_EXPAND_OVERRIDES,
      'OTMENA',
    );
    expect(expanded.expanded).toEqual(['deal-1']);
    expect(computeIsExpanded('deal-1', activeItems, 'smart', expanded, 'OTMENA')).toBe(true);
  });

  it('allows manually expanding duplicate opportunities in smart mode', () => {
    const activeItems = [{ stage: 'V_RABOTE' as const }];
    expect(
      computeIsExpanded('deal-1', activeItems, 'smart', EMPTY_EXPAND_OVERRIDES, 'DUBL'),
    ).toBe(false);

    const expanded = toggleExpandOverride(
      'deal-1',
      activeItems,
      'smart',
      EMPTY_EXPAND_OVERRIDES,
      'DUBL',
    );
    expect(expanded.expanded).toEqual(['deal-1']);
    expect(computeIsExpanded('deal-1', activeItems, 'smart', expanded, 'DUBL')).toBe(true);
  });

  it('expands every deal with positions in expanded mode', () => {
    const activeItems = [{ stage: 'V_RABOTE' as const }];
    const doneItems = [{ stage: 'GOTOVO' as const }];

    expect(computeIsExpanded('deal-1', activeItems, 'expanded', EMPTY_EXPAND_OVERRIDES)).toBe(
      true,
    );
    expect(
      computeIsExpanded('deal-1', doneItems, 'expanded', EMPTY_EXPAND_OVERRIDES, 'GOTOVO'),
    ).toBe(true);
    expect(
      computeIsExpanded('deal-1', activeItems, 'expanded', EMPTY_EXPAND_OVERRIDES, 'OTMENA'),
    ).toBe(true);
    expect(
      computeIsExpanded('deal-1', activeItems, 'expanded', EMPTY_EXPAND_OVERRIDES, 'DUBL'),
    ).toBe(true);
  });

  it('remembers manual collapse in expanded mode', () => {
    const activeItems = [{ stage: 'V_RABOTE' as const }];
    const collapsed = toggleExpandOverride(
      'deal-1',
      activeItems,
      'expanded',
      EMPTY_EXPAND_OVERRIDES,
      'GOTOVO',
    );

    expect(collapsed.collapsed).toEqual(['deal-1']);
    expect(computeIsExpanded('deal-1', activeItems, 'expanded', collapsed, 'GOTOVO')).toBe(false);

    const restored = toggleExpandOverride('deal-1', activeItems, 'expanded', collapsed, 'GOTOVO');
    expect(restored.collapsed).toEqual([]);
    expect(computeIsExpanded('deal-1', activeItems, 'expanded', restored, 'GOTOVO')).toBe(true);
  });

  it('remembers manual expansion for a deal without positions', () => {
    const expanded = toggleExpandOverride(
      'deal-1',
      [],
      'smart',
      EMPTY_EXPAND_OVERRIDES,
    );

    expect(expanded.expanded).toEqual(['deal-1']);
    expect(computeIsExpanded('deal-1', [], 'smart', expanded)).toBe(true);
  });
});
