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

  it('uses keyword catalog match when tip becomes RESTAVRACIYA', () => {
    const catalog = [
      {
        id: 'd',
        label: 'Default',
        url: 'https://d',
        isDefault: true,
      },
      {
        id: 'h',
        label: 'Hvatayka rest',
        url: 'https://hvatayka',
        matchKeywords: 'хватайка',
        priority: 5,
      },
    ];
    expect(
      planRestorationMaketAuto('PLENKA', 'RESTAVRACIYA', null, {
        lineItemName: 'Автомат Хватайка белый',
        catalog,
      }),
    ).toEqual({
      ssylkaNaMakety: {
        primaryLinkUrl: 'https://hvatayka',
        primaryLinkLabel: 'Hvatayka rest',
      },
    });
  });
});
