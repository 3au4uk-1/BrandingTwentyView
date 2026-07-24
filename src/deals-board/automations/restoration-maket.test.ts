import { describe, expect, it } from 'vitest';

import { getDefaultRestorationMaket } from 'src/constants/standard-restoration-makets';

import { planRestorationMaketAuto } from './restoration-maket';

describe('planRestorationMaketAuto', () => {
  it('fills default when tip becomes RESTAVRACIYA and link empty', () => {
    const maket = getDefaultRestorationMaket();
    expect(planRestorationMaketAuto('PLENKA', 'RESTAVRACIYA', null)).toEqual({
      ssylkaNaMakety: {
        primaryLinkUrl: maket.url,
        primaryLinkLabel: maket.label,
      },
    });
  });

  it('does not overwrite existing link', () => {
    expect(
      planRestorationMaketAuto('PLENKA', 'RESTAVRACIYA', {
        primaryLinkUrl: 'https://keep.me',
      }),
    ).toBeNull();
  });

  it('does nothing when tip already RESTAVRACIYA', () => {
    expect(planRestorationMaketAuto('RESTAVRACIYA', 'RESTAVRACIYA', null)).toBeNull();
  });

  it('ignores other tip changes', () => {
    expect(planRestorationMaketAuto('PLENKA', 'BANNERA', null)).toBeNull();
  });
});
