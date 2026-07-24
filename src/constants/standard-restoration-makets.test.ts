import { describe, expect, it } from 'vitest';

import {
  getDefaultRestorationMaket,
  isMaketLinkEmpty,
  toSsylkaNaMakety,
} from './standard-restoration-makets';

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
