import { describe, expect, it } from 'vitest';

import {
  getTipDetailOptionsForTip,
  isTipDetailValidForTip,
} from './tip-detail';
import { nextTipDetailForTipChange } from 'src/deals-board/editors/TipDetailSelect';

describe('tipDetail options', () => {
  it('returns кто едет? + people for BANNERA', () => {
    expect(getTipDetailOptionsForTip('BANNERA').map((o) => o.value)).toEqual([
      'KTO_EDET',
      'YURA',
      'MAGA',
      'TOPILSKIY',
    ]);
  });

  it('returns contractors for PODRYAD', () => {
    expect(getTipDetailOptionsForTip('PODRYAD').map((o) => o.value)).toContain('GLAV_PRINT');
    expect(getTipDetailOptionsForTip('PODRYAD')).toHaveLength(6);
  });

  it('returns Наши / Не наши for RESTAVRACIYA', () => {
    expect(getTipDetailOptionsForTip('RESTAVRACIYA').map((o) => o.value)).toEqual([
      'NASHI',
      'NE_NASHI',
    ]);
  });

  it('validates tipDetail against tip', () => {
    expect(isTipDetailValidForTip('BANNERA', 'YURA')).toBe(true);
    expect(isTipDetailValidForTip('BANNERA', 'KTO_EDET')).toBe(true);
    expect(isTipDetailValidForTip('BANNERA', 'GLAV_PRINT')).toBe(false);
  });
});

describe('nextTipDetailForTipChange', () => {
  it('defaults PLENKA and RESTAVRACIYA to NASHI', () => {
    expect(nextTipDetailForTipChange('PLENKA', null)).toBe('NASHI');
    expect(nextTipDetailForTipChange('RESTAVRACIYA', null)).toBe('NASHI');
  });

  it('defaults BANNERA to кто едет?', () => {
    expect(nextTipDetailForTipChange('BANNERA', null)).toBe('KTO_EDET');
  });

  it('clears incompatible detail when tip changes', () => {
    expect(nextTipDetailForTipChange('PODRYAD', 'YURA')).toBe(null);
  });

  it('keeps compatible detail', () => {
    expect(nextTipDetailForTipChange('BANNERA', 'MAGA')).toBe('MAGA');
  });
});
