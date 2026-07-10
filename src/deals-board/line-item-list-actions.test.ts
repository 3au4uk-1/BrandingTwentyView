import { describe, expect, it } from 'vitest';

import { LINE_ITEM_LIST_ACTIONS } from './line-item-list-actions';

describe('LINE_ITEM_LIST_ACTIONS', () => {
  it('keeps readable UTF-8 labels and compact button text', () => {
    expect(
      LINE_ITEM_LIST_ACTIONS.map(({ label, shortLabel }) => ({ label, shortLabel })),
    ).toEqual([
      { label: 'В блеклист', shortLabel: 'БЛ' },
      { label: 'В реставрацию', shortLabel: 'Р' },
      { label: 'В подряд', shortLabel: 'П' },
      { label: 'В баннер', shortLabel: 'БН' },
    ]);
  });
});
