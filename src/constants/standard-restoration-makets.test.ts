import { describe, expect, it } from 'vitest';

import {
  getDefaultRestorationMaket,
  isMaketLinkEmpty,
  parseMatchKeywords,
  pickRestorationMaket,
  toSsylkaNaMakety,
  type RestorationMaketCatalogEntry,
} from './standard-restoration-makets';

describe('parseMatchKeywords', () => {
  it('splits and lowercases', () => {
    expect(parseMatchKeywords('Хватайка, корпус; фасад')).toEqual([
      'хватайка',
      'корпус',
      'фасад',
    ]);
  });
});

describe('pickRestorationMaket', () => {
  const catalog: RestorationMaketCatalogEntry[] = [
    {
      id: '1',
      label: 'Default',
      url: 'https://d',
      isDefault: true,
      priority: 0,
    },
    {
      id: '2',
      label: 'Hvatayka',
      url: 'https://h',
      matchKeywords: 'хватайка',
      priority: 10,
    },
    {
      id: '3',
      label: 'Inactive hit',
      url: 'https://x',
      matchKeywords: 'хватайка',
      priority: 99,
      isActive: false,
    },
  ];

  it('prefers keyword match with higher priority', () => {
    expect(
      pickRestorationMaket(catalog, 'Автомат Хватайка белый 80х80')?.id,
    ).toBe('2');
  });

  it('falls back to default when no keyword hit', () => {
    expect(pickRestorationMaket(catalog, 'Фотобудка квадратная')?.id).toBe('1');
  });

  it('ignores inactive templates', () => {
    expect(
      pickRestorationMaket(catalog, 'Автомат Хватайка')?.url,
    ).toBe('https://h');
  });
});

describe('standard-restoration-makets', () => {
  it('detects empty links', () => {
    expect(isMaketLinkEmpty(undefined)).toBe(true);
    expect(isMaketLinkEmpty({ primaryLinkUrl: '  ' })).toBe(true);
    expect(isMaketLinkEmpty({ primaryLinkUrl: 'https://x' })).toBe(false);
  });

  it('maps default maket to CRM link shape', () => {
    const maket = getDefaultRestorationMaket();
    expect(maket.isDefault).toBe(true);
    expect(toSsylkaNaMakety(maket)).toEqual({
      primaryLinkUrl: maket.url,
      primaryLinkLabel: maket.label,
    });
  });
});
