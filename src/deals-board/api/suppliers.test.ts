import { describe, expect, it } from 'vitest';

import { findSupplierByNameAndCategory } from './suppliers';
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
