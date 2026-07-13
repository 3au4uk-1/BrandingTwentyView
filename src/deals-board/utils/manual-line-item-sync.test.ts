import { describe, expect, it } from 'vitest';
import {
  isMeaningfulManualLineItemChange,
  buildManualLineItemSyncPayload,
} from './manual-line-item-sync';
import { DEFAULT_MANUAL_LINE_ITEM_NAME } from 'src/constants/line-item-origin';

describe('isMeaningfulManualLineItemChange', () => {
  const baseline = { name: DEFAULT_MANUAL_LINE_ITEM_NAME, kolichestvo: 1, amountMicros: 0 };

  it('returns false for unchanged defaults', () => {
    expect(isMeaningfulManualLineItemChange(baseline, baseline)).toBe(false);
  });

  it('returns true when name changes', () => {
    expect(isMeaningfulManualLineItemChange(baseline, { ...baseline, name: 'Баннер' })).toBe(true);
  });

  it('returns true when amount becomes positive', () => {
    expect(isMeaningfulManualLineItemChange(baseline, { ...baseline, amountMicros: 100 })).toBe(true);
  });

  it('returns true when quantity changes', () => {
    expect(isMeaningfulManualLineItemChange(baseline, { ...baseline, kolichestvo: 2 })).toBe(true);
  });
});

describe('buildManualLineItemSyncPayload', () => {
  it('maps line item row to parser body', () => {
    expect(
      buildManualLineItemSyncPayload({
        id: 'li-1',
        opportunityId: 'opp-1',
        name: 'Баннер',
        kolichestvo: 2,
        amount: { amountMicros: 500_000_000, currencyCode: 'RUB' },
      }),
    ).toEqual({
      opportunityId: 'opp-1',
      name: 'Баннер',
      kolichestvo: 2,
      amountMicros: 500_000_000,
      currencyCode: 'RUB',
    });
  });
});
