import { describe, expect, it } from 'vitest';
import { buildOpportunityNodeSelection } from './build-opportunity-selection';

describe('buildOpportunityNodeSelection', () => {
  it('always includes base fields', () => {
    const selection = buildOpportunityNodeSelection([]);
    expect(selection).toMatchObject({ id: true, name: true, companyId: true });
  });

  it('includes nested company when companyName is visible', () => {
    const selection = buildOpportunityNodeSelection(['companyName']);
    expect(selection.company).toEqual({ id: true, name: true });
  });

  it('includes amount sub-selection for currency field', () => {
    const selection = buildOpportunityNodeSelection(['amount'], false, { amount: 'CURRENCY' });
    expect(selection.amount).toEqual({ amountMicros: true, currencyCode: true });
  });

  it('includes currency sub-selection for any CURRENCY field from metadata', () => {
    const selection = buildOpportunityNodeSelection(['summaPostupleniy'], false, {
      summaPostupleniy: 'CURRENCY',
    });
    expect(selection.summaPostupleniy).toEqual({ amountMicros: true, currencyCode: true });
  });

  it('includes link sub-selection for LINKS fields', () => {
    const selection = buildOpportunityNodeSelection(['tonyLink']);
    expect(selection.tonyLink).toEqual({ primaryLinkUrl: true, primaryLinkLabel: true });
  });

  it('includes relation sub-selection for RELATION fields', () => {
    const selection = buildOpportunityNodeSelection(['pointOfContact'], false, {
      pointOfContact: 'RELATION',
    });
    expect(selection.pointOfContact).toEqual({ id: true, name: true });
  });
});
