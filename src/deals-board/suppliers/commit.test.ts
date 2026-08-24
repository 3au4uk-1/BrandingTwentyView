import { describe, expect, it, vi } from 'vitest';

import { commitSupplierName } from './commit';
import type { SupplierRow } from './picker';

const yura: SupplierRow = {
  id: 's1',
  name: 'Юра',
  category: 'BANNERA',
  isActive: true,
};

const hidden: SupplierRow = {
  id: 's2',
  name: 'Саша Марда',
  category: 'BANNERA',
  isActive: false,
};

describe('commitSupplierName', () => {
  it('clears the relation on empty name without creating', async () => {
    const createSupplier = vi.fn();
    const updateSupplier = vi.fn();
    const updateLineItem = vi.fn().mockResolvedValue(undefined);

    await commitSupplierName({
      name: '   ',
      currentLabel: 'Юра',
      tip: 'BANNERA',
      recordId: 'li-1',
      currentSupplierId: 's1',
      suppliers: [yura],
      createSupplier,
      updateSupplier,
      updateLineItem,
    });

    expect(createSupplier).not.toHaveBeenCalled();
    expect(updateSupplier).not.toHaveBeenCalled();
    expect(updateLineItem).toHaveBeenCalledWith('li-1', { supplierId: null });
  });

  it('does nothing when empty name and already no supplier', async () => {
    const createSupplier = vi.fn();
    const updateSupplier = vi.fn();
    const updateLineItem = vi.fn();

    await commitSupplierName({
      name: '',
      currentLabel: '',
      tip: 'BANNERA',
      recordId: 'li-1',
      currentSupplierId: null,
      suppliers: [yura],
      createSupplier,
      updateSupplier,
      updateLineItem,
    });

    expect(createSupplier).not.toHaveBeenCalled();
    expect(updateLineItem).not.toHaveBeenCalled();
  });

  it('reactivates a hidden match then patches the line item', async () => {
    const createSupplier = vi.fn();
    const updateSupplier = vi.fn().mockResolvedValue(undefined);
    const updateLineItem = vi.fn().mockResolvedValue(undefined);

    await commitSupplierName({
      name: 'саша марда',
      currentLabel: '',
      tip: 'BANNERA',
      recordId: 'li-1',
      currentSupplierId: null,
      suppliers: [yura, hidden],
      createSupplier,
      updateSupplier,
      updateLineItem,
    });

    expect(createSupplier).not.toHaveBeenCalled();
    expect(updateSupplier).toHaveBeenCalledWith('s2', { isActive: true });
    expect(updateLineItem).toHaveBeenCalledWith('li-1', { supplierId: 's2' });
  });

  it('creates when missing then patches the line item', async () => {
    const createSupplier = vi.fn().mockResolvedValue({
      id: 's-new',
      name: 'Новый',
      category: 'BANNERA',
      isActive: true,
    });
    const updateSupplier = vi.fn();
    const updateLineItem = vi.fn().mockResolvedValue(undefined);

    await commitSupplierName({
      name: '  Новый  ',
      currentLabel: '',
      tip: 'BANNERA',
      recordId: 'li-1',
      currentSupplierId: null,
      suppliers: [yura],
      createSupplier,
      updateSupplier,
      updateLineItem,
    });

    expect(createSupplier).toHaveBeenCalledWith({ name: 'Новый', category: 'BANNERA' });
    expect(updateLineItem).toHaveBeenCalledWith('li-1', { supplierId: 's-new' });
  });

  it('skips commit when normalized draft equals current label', async () => {
    const createSupplier = vi.fn();
    const updateSupplier = vi.fn();
    const updateLineItem = vi.fn();

    await commitSupplierName({
      name: '  юра  ',
      currentLabel: 'Юра',
      tip: 'BANNERA',
      recordId: 'li-1',
      currentSupplierId: 's1',
      suppliers: [yura],
      createSupplier,
      updateSupplier,
      updateLineItem,
    });

    expect(createSupplier).not.toHaveBeenCalled();
    expect(updateSupplier).not.toHaveBeenCalled();
    expect(updateLineItem).not.toHaveBeenCalled();
  });

  it('skips commit when tipDetail label is unchanged', async () => {
    const createSupplier = vi.fn();
    const updateSupplier = vi.fn();
    const updateLineItem = vi.fn();

    await commitSupplierName({
      name: 'Печать',
      currentLabel: 'Печать',
      tip: 'BANNERA',
      recordId: 'li-1',
      currentSupplierId: null,
      suppliers: [yura],
      createSupplier,
      updateSupplier,
      updateLineItem,
    });

    expect(createSupplier).not.toHaveBeenCalled();
    expect(updateLineItem).not.toHaveBeenCalled();
  });

  it('still clears when user empties a populated field', async () => {
    const createSupplier = vi.fn();
    const updateSupplier = vi.fn();
    const updateLineItem = vi.fn().mockResolvedValue(undefined);

    await commitSupplierName({
      name: '',
      currentLabel: 'Юра',
      tip: 'BANNERA',
      recordId: 'li-1',
      currentSupplierId: 's1',
      suppliers: [yura],
      createSupplier,
      updateSupplier,
      updateLineItem,
    });

    expect(createSupplier).not.toHaveBeenCalled();
    expect(updateSupplier).not.toHaveBeenCalled();
    expect(updateLineItem).toHaveBeenCalledWith('li-1', { supplierId: null });
  });
});
