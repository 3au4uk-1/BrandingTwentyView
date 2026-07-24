import { describe, expect, it } from 'vitest';

import {
  getTipDetailOptionsForTip,
  isTipDetailValidForTip,
} from './tip-detail';
import { nextTipDetailForTipChange } from 'src/deals-board/editors/TipDetailSelect';

describe('tipDetail options', () => {
  it('returns banner people for BANNERA', () => {
    expect(getTipDetailOptionsForTip('BANNERA').map((o) => o.value)).toEqual([
      'YURA',
      'MAGA',
      'TOPILSKIY',
    ]);
  });

  it('returns contractors for PODRYAD', () => {
    expect(getTipDetailOptionsForTip('PODRYAD').map((o) => o.value)).toContain('GLAV_PRINT');
    expect(getTipDetailOptionsForTip('PODRYAD')).toHaveLength(6);
  });

  it('returns empty for RESTAVRACIYA', () => {
    expect(getTipDetailOptionsForTip('RESTAVRACIYA')).toEqual([]);
  });

  it('validates tipDetail against tip', () => {
    expect(isTipDetailValidForTip('BANNERA', 'YURA')).toBe(true);
    expect(isTipDetailValidForTip('BANNERA', 'GLAV_PRINT')).toBe(false);
  });
});

describe('nextTipDetailForTipChange', () => {
  it('defaults PLENKA to NASHI', () => {
    expect(nextTipDetailForTipChange('PLENKA', null)).toBe('NASHI');
  });

  it('clears incompatible detail when tip changes', () => {
    expect(nextTipDetailForTipChange('PODRYAD', 'YURA')).toBe(null);
  });

  it('keeps compatible detail', () => {
    expect(nextTipDetailForTipChange('BANNERA', 'MAGA')).toBe('MAGA');
  });
});
