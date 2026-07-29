import { describe, expect, it } from 'vitest';

import {
  isBrandingFreeEntryName,
  planBrandingFreeNameRename,
} from './branding-free-name';

describe('branding free name', () => {
  it('matches template names', () => {
    expect(
      isBrandingFreeEntryName('БРЕНДИНГ свободная запись ( КОМЕНТАРИЙ ОБЯЗАТЕЛЕН )'),
    ).toBe(true);
    expect(isBrandingFreeEntryName('Баннер 2x3')).toBe(false);
  });

  it('renames once from comment', () => {
    expect(
      planBrandingFreeNameRename(
        'БРЕНДИНГ свободная запись ( КОМЕНТАРИЙ ОБЯЗАТЕЛЕН )',
        'Логотип на стол',
      ),
    ).toBe('Логотип на стол');
  });

  it('does not rename after name already changed', () => {
    expect(planBrandingFreeNameRename('Логотип на стол', 'другой текст')).toBe(null);
  });

  it('ignores empty comment', () => {
    expect(
      planBrandingFreeNameRename('БРЕНДИНГ свободная запись ( КОМЕНТАРИЙ ОБЯЗАТЕЛЕН )', '  '),
    ).toBe(null);
  });
});
