import { describe, expect, it } from 'vitest';

import type { LineItemListStatus } from '../api/crmparser';
import {
  filterBoardByParserLabels,
  isLineItemHiddenByParserLabels,
  parseHiddenParserLabels,
  type ParserLabelId,
} from './parser-label-filter';

const status = (patch: Partial<LineItemListStatus>): LineItemListStatus => ({
  blacklisted: false,
  restorationMatch: false,
  podryadMatch: false,
  bannerMatch: false,
  pattern: null,
  dealId: null,
  dealTwentyId: null,
  ...patch,
});

describe('parser label filter', () => {
  it('keeps commerce positions when restoration is hidden', () => {
    const hidden = new Set<ParserLabelId>(['restoration']);
    const items = [
      { id: 'commerce', opportunityId: 'deal-1' },
      { id: 'rest', opportunityId: 'deal-1' },
      { id: 'banner', opportunityId: 'deal-2' },
    ];
    const deals = [{ id: 'deal-1' }, { id: 'deal-2' }, { id: 'deal-3' }];
    const statuses = {
      commerce: status({}),
      rest: status({ restorationMatch: true }),
      banner: status({ bannerMatch: true }),
    };

    expect(filterBoardByParserLabels(items, deals, statuses, hidden)).toEqual({
      items: [items[0], items[2]],
      deals,
    });
  });

  it('drops a deal when every position carries a hidden label', () => {
    const hidden = new Set<ParserLabelId>(['restoration']);
    const items = [{ id: 'rest', opportunityId: 'deal-1' }];
    const deals = [{ id: 'deal-1' }, { id: 'deal-2' }];

    const result = filterBoardByParserLabels(items, deals, {
      rest: status({ restorationMatch: true }),
    }, hidden);

    expect(result.items).toEqual([]);
    expect(result.deals).toEqual([{ id: 'deal-2' }]);
  });

  it('hides a position that matches any disabled label', () => {
    const hidden = new Set<ParserLabelId>(['banner', 'restoration']);
    expect(
      isLineItemHiddenByParserLabels(status({ restorationMatch: true, bannerMatch: true }), hidden),
    ).toBe(true);
    expect(isLineItemHiddenByParserLabels(status({}), hidden)).toBe(false);
    expect(isLineItemHiddenByParserLabels(undefined, hidden)).toBe(false);
  });

  it('does not filter until a label is turned off', () => {
    const items = [{ id: 'rest', opportunityId: 'deal-1' }];
    const deals = [{ id: 'deal-1' }];
    expect(
      filterBoardByParserLabels(items, deals, { rest: status({ restorationMatch: true }) }, new Set()),
    ).toEqual({ items, deals });
  });

  it('parses stored hidden labels and ignores unknown values', () => {
    expect(parseHiddenParserLabels(JSON.stringify(['restoration', 'nope', 'banner']))).toEqual([
      'restoration',
      'banner',
    ]);
    expect(parseHiddenParserLabels('not-json')).toEqual([]);
  });
});
