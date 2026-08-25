import { describe, expect, it, vi } from 'vitest';

import { findSupplierByNameAndCategory, ensureSupplierWithClient } from './suppliers';
import type { SupplierRow } from '../suppliers/picker';

const yura: SupplierRow = {
  id: 's1',
  name: 'Юра',
  category: 'BANNERA',
  isActive: true,
};

const sasha: SupplierRow = {
  id: 's2',
  name: 'Саша Марда',
  category: 'BANNERA',
  isActive: true,
};

const print: SupplierRow = {
  id: 's3',
  name: 'Глав принт',
  category: 'PODRYAD',
  isActive: true,
};

describe('findSupplierByNameAndCategory', () => {
  const list = [yura, sasha, print];

  it('matches ignoring case and extra spaces', () => {
    expect(findSupplierByNameAndCategory(list, '  саша   марда ', 'BANNERA')).toEqual(sasha);
  });

  it('does not match a different category', () => {
    expect(findSupplierByNameAndCategory(list, 'Юра', 'PODRYAD')).toBeUndefined();
  });

  it('returns undefined when the name is missing', () => {
    expect(findSupplierByNameAndCategory(list, 'Нет такого', 'BANNERA')).toBeUndefined();
  });
});

describe('ensureSupplierWithClient', () => {
  it('does not POST when the same name already exists in the category', async () => {
    const get = vi.fn().mockResolvedValue({
      data: { suppliers: [print] },
    });
    const post = vi.fn();
    const patch = vi.fn();

    const row = await ensureSupplierWithClient({ get, post, patch } as never, {
      name: '  глав   принт ',
      category: 'PODRYAD',
    });

    expect(row).toEqual(print);
    expect(post).not.toHaveBeenCalled();
    expect(patch).not.toHaveBeenCalled();
  });

  it('reactivates a hidden match instead of creating another row', async () => {
    const hiddenPrint = { ...print, isActive: false };
    const get = vi.fn().mockResolvedValue({
      data: { suppliers: [hiddenPrint] },
    });
    const post = vi.fn();
    const patch = vi.fn().mockResolvedValue(undefined);

    const row = await ensureSupplierWithClient({ get, post, patch } as never, {
      name: 'Глав принт',
      category: 'PODRYAD',
    });

    expect(post).not.toHaveBeenCalled();
    expect(patch).toHaveBeenCalledWith('/rest/suppliers/s3', { isActive: true });
    expect(row).toMatchObject({ id: 's3', isActive: true });
  });

  it('posts once when two creates race before the list updates', async () => {
    const get = vi.fn().mockResolvedValue({ data: { suppliers: [] } });
    let resolvePost!: (value: unknown) => void;
    const post = vi.fn(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        }),
    );
    const patch = vi.fn();
    const input = { name: 'AAAA', category: 'PODRYAD' };

    const first = ensureSupplierWithClient({ get, post, patch } as never, input);
    const second = ensureSupplierWithClient({ get, post, patch } as never, input);
    await vi.waitFor(() => {
      expect(post).toHaveBeenCalledTimes(1);
    });
    resolvePost({
      data: {
        createSupplier: {
          id: 's-new',
          name: 'AAAA',
          category: 'PODRYAD',
          isActive: true,
        },
      },
    });
    const rows = await Promise.all([first, second]);

    expect(post).toHaveBeenCalledTimes(1);
    expect(rows[0]?.id).toBe('s-new');
    expect(rows[1]?.id).toBe('s-new');
  });
});
