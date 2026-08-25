import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  commitSupplierName,
  commitSupplierNameGuarded,
  createSupplierCommitInFlightGuard,
  resetSupplierCreateMemoForTests,
} from './commit';
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

beforeEach(() => {
  resetSupplierCreateMemoForTests();
});

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

  it('does not create a supplier named кто едет? when the stored label is empty', async () => {
    const createSupplier = vi.fn();
    const updateSupplier = vi.fn();
    const updateLineItem = vi.fn();

    await commitSupplierName({
      name: 'кто едет?',
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

  it('links a real name even when the cell still shows a tipDetail placeholder', async () => {
    const createSupplier = vi.fn();
    const updateSupplier = vi.fn();
    const updateLineItem = vi.fn().mockResolvedValue(undefined);

    await commitSupplierName({
      name: 'Юра',
      currentLabel: 'кто едет?',
      tip: 'BANNERA',
      recordId: 'li-1',
      currentSupplierId: null,
      suppliers: [yura],
      createSupplier,
      updateSupplier,
      updateLineItem,
    });

    expect(createSupplier).not.toHaveBeenCalled();
    expect(updateLineItem).toHaveBeenCalledWith('li-1', { supplierId: 's1' });
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

describe('commitSupplierNameGuarded', () => {
  const baseDeps = {
    currentLabel: '',
    tip: 'BANNERA',
    recordId: 'li-1',
    currentSupplierId: null as string | null,
    suppliers: [yura],
    updateSupplier: vi.fn().mockResolvedValue(undefined),
    updateLineItem: vi.fn().mockResolvedValue(undefined),
  };

  it('ignores a second commit while the first createSupplier is in flight', async () => {
    let resolveCreate!: (row: SupplierRow) => void;
    const createSupplier = vi.fn(
      () =>
        new Promise<SupplierRow>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const guard = createSupplierCommitInFlightGuard();

    const first = commitSupplierNameGuarded(guard, {
      ...baseDeps,
      name: 'Новый',
      createSupplier,
    });
    const second = commitSupplierNameGuarded(guard, {
      ...baseDeps,
      name: 'Новый',
      createSupplier,
    });

    expect(await second).toBe('skipped-in-flight');

    resolveCreate({
      id: 's-new',
      name: 'Новый',
      category: 'BANNERA',
      isActive: true,
    });
    expect(await first).toBe('committed');
    expect(createSupplier).toHaveBeenCalledTimes(1);
  });

  it('still clears on empty name when not in flight', async () => {
    const createSupplier = vi.fn();
    const updateSupplier = vi.fn();
    const updateLineItem = vi.fn().mockResolvedValue(undefined);
    const guard = createSupplierCommitInFlightGuard();

    const result = await commitSupplierNameGuarded(guard, {
      ...baseDeps,
      name: '   ',
      currentLabel: 'Юра',
      currentSupplierId: 's1',
      createSupplier,
      updateSupplier,
      updateLineItem,
    });

    expect(result).toBe('committed');
    expect(createSupplier).not.toHaveBeenCalled();
    expect(updateLineItem).toHaveBeenCalledWith('li-1', { supplierId: null });
  });

  it('commits again after the prior commit finishes with a changed name', async () => {
    const createSupplier = vi
      .fn()
      .mockResolvedValueOnce({
        id: 's-a',
        name: 'Альфа',
        category: 'BANNERA',
        isActive: true,
      })
      .mockResolvedValueOnce({
        id: 's-b',
        name: 'Бета',
        category: 'BANNERA',
        isActive: true,
      });
    const guard = createSupplierCommitInFlightGuard();

    expect(
      await commitSupplierNameGuarded(guard, {
        ...baseDeps,
        name: 'Альфа',
        createSupplier,
      }),
    ).toBe('committed');
    expect(
      await commitSupplierNameGuarded(guard, {
        ...baseDeps,
        name: 'Бета',
        currentLabel: 'Альфа',
        createSupplier,
      }),
    ).toBe('committed');

    expect(createSupplier).toHaveBeenCalledTimes(2);
  });

  it('skips unchanged names without holding the in-flight lock', async () => {
    const createSupplier = vi.fn().mockResolvedValue({
      id: 's-b',
      name: 'Бета',
      category: 'BANNERA',
      isActive: true,
    });
    const guard = createSupplierCommitInFlightGuard();

    expect(
      await commitSupplierNameGuarded(guard, {
        ...baseDeps,
        name: '  юра  ',
        currentLabel: 'Юра',
        currentSupplierId: 's1',
        createSupplier,
      }),
    ).toBe('skipped-unchanged');
    expect(createSupplier).not.toHaveBeenCalled();
    expect(
      await commitSupplierNameGuarded(guard, {
        ...baseDeps,
        name: 'Бета',
        createSupplier,
      }),
    ).toBe('committed');
    expect(createSupplier).toHaveBeenCalledTimes(1);
  });
});

describe('commitSupplierName create coalescing', () => {
  it('does not create again when suppliers cache is still stale after a successful create', async () => {
    const created: SupplierRow = {
      id: 's-new',
      name: 'Новый',
      category: 'BANNERA',
      isActive: true,
    };
    const createSupplier = vi.fn().mockResolvedValue(created);
    const updateLineItem = vi.fn().mockResolvedValue(undefined);

    await commitSupplierName({
      name: 'Новый',
      currentLabel: '',
      tip: 'BANNERA',
      recordId: 'li-1',
      currentSupplierId: null,
      suppliers: [yura],
      createSupplier,
      updateSupplier: vi.fn(),
      updateLineItem,
    });
    await commitSupplierName({
      name: 'Новый',
      currentLabel: '',
      tip: 'BANNERA',
      recordId: 'li-1',
      currentSupplierId: null,
      suppliers: [yura],
      createSupplier,
      updateSupplier: vi.fn(),
      updateLineItem,
    });

    expect(createSupplier).toHaveBeenCalledTimes(1);
    expect(updateLineItem).toHaveBeenCalledTimes(2);
    expect(updateLineItem).toHaveBeenNthCalledWith(2, 'li-1', { supplierId: 's-new' });
  });

  it('shares one createSupplier when two commits race on the same name', async () => {
    let resolveCreate!: (row: SupplierRow) => void;
    const createSupplier = vi.fn(
      () =>
        new Promise<SupplierRow>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    const updateLineItem = vi.fn().mockResolvedValue(undefined);
    const deps = {
      currentLabel: '',
      tip: 'BANNERA',
      recordId: 'li-1',
      currentSupplierId: null as string | null,
      suppliers: [yura],
      createSupplier,
      updateSupplier: vi.fn(),
      updateLineItem,
    };

    const first = commitSupplierName({ ...deps, name: 'Новый' });
    const second = commitSupplierName({ ...deps, name: 'Новый', recordId: 'li-2' });

    resolveCreate({
      id: 's-new',
      name: 'Новый',
      category: 'BANNERA',
      isActive: true,
    });
    await Promise.all([first, second]);

    expect(createSupplier).toHaveBeenCalledTimes(1);
    expect(updateLineItem).toHaveBeenCalledWith('li-1', { supplierId: 's-new' });
    expect(updateLineItem).toHaveBeenCalledWith('li-2', { supplierId: 's-new' });
  });
});
