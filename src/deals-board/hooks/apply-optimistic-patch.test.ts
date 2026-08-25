import { describe, expect, it } from 'vitest';

import type { LineItemRow } from '../types';
import { applyOptimisticPatch } from './useLineItems';

const item = (overrides: Partial<LineItemRow> = {}): LineItemRow => ({
  id: 'li-1',
  opportunityId: 'opp-1',
  name: 'Баннер',
  supplierId: 'sup-1',
  supplier: { id: 'sup-1', name: 'Юра' },
  ...overrides,
});

describe('applyOptimisticPatch supplierId', () => {
  it('clears supplier and supplierId when patching supplierId null', () => {
    const next = applyOptimisticPatch(item(), { supplierId: null, tip: 'PLENKA' });
    expect(next.supplierId).toBeNull();
    expect(next.supplier).toBeNull();
    expect(next.tip).toBe('PLENKA');
  });

  it('sets supplierId and leaves supplier.name until refetch', () => {
    const next = applyOptimisticPatch(item(), { supplierId: 'sup-2' });
    expect(next.supplierId).toBe('sup-2');
    expect(next.supplier).toEqual({ id: 'sup-1', name: 'Юра' });
  });

  it('applies nested supplier from the patch so the cell can show the new name', () => {
    const next = applyOptimisticPatch(item({ supplier: null, supplierId: null }), {
      supplierId: 'sup-2',
      supplier: { id: 'sup-2', name: 'Саша Марда' },
    });
    expect(next.supplierId).toBe('sup-2');
    expect(next.supplier).toEqual({ id: 'sup-2', name: 'Саша Марда' });
  });
});
