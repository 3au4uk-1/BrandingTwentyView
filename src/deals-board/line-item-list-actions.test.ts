import { describe, expect, it } from 'vitest';

import { BOARD_STREAM } from 'src/constants/product-stream';

import {
  filterActionsForBoardStream,
  LINE_ITEM_LIST_ACTIONS,
} from './line-item-list-actions';

describe('LINE_ITEM_LIST_ACTIONS', () => {
  it('keeps readable UTF-8 labels and compact button text for branding lists', () => {
    const brandingActions = filterActionsForBoardStream(BOARD_STREAM.BRANDING);
    expect(
      brandingActions.map(({ label, shortLabel }) => ({ label, shortLabel })),
    ).toEqual([
      { label: 'В блеклист', shortLabel: 'БЛ' },
      { label: 'В реставрацию', shortLabel: 'Р' },
      { label: 'В подряд', shortLabel: 'П' },
      { label: 'В баннер', shortLabel: 'БН' },
    ]);
  });
});

describe('filterActionsForBoardStream', () => {
  it('returns branding list actions on the branding board', () => {
    const actions = filterActionsForBoardStream(BOARD_STREAM.BRANDING);
    expect(actions.map((action) => action.list)).toEqual([
      'blacklist',
      'restoration',
      'podryad',
      'banner',
    ]);
  });

  it('returns decor and MK blacklist actions on the decor_mk board', () => {
    const actions = filterActionsForBoardStream(BOARD_STREAM.DECOR_MK);
    expect(actions.map((action) => action.list)).toEqual(['decor_blacklist', 'mk_blacklist']);
    expect(actions.map(({ label, shortLabel }) => ({ label, shortLabel }))).toEqual([
      { label: 'В блеклист декор', shortLabel: 'БД' },
      { label: 'В блеклист МК', shortLabel: 'БМ' },
    ]);
  });

  it('defines all six list actions in LINE_ITEM_LIST_ACTIONS', () => {
    expect(LINE_ITEM_LIST_ACTIONS.map((action) => action.list)).toEqual([
      'blacklist',
      'restoration',
      'podryad',
      'banner',
      'decor_blacklist',
      'mk_blacklist',
    ]);
  });
});
