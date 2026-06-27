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
    const selection = buildOpportunityNodeSelection(['amount']);
    expect(selection.amount).toEqual({ amountMicros: true, currencyCode: true });
  });

  it('includes link sub-selection for LINKS fields', () => {
    const selection = buildOpportunityNodeSelection(['tonyLink']);
    expect(selection.tonyLink).toEqual({ primaryLinkUrl: true, primaryLinkLabel: true });
  });
});
