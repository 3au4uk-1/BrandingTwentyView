import { describe, expect, it } from 'vitest';

import { MOBILE_VIEW_NAME } from 'src/constants/mobile-view';

import type { DealBoardViewRecord } from '../types';
import { resolveActiveDealBoardView } from './resolve-active-view';

const makeView = (
  id: string,
  name: string,
  isDefault = false,
): DealBoardViewRecord => ({
  id,
  name,
  visibility: 'WORKSPACE',
  parentColumns: [],
  childColumns: [],
  filters: {},
  sort: [],
  isDefault,
});

describe('resolveActiveDealBoardView', () => {
  const views = [
    makeView('desktop', 'Будущие сделки', true),
    makeView('mobile', MOBILE_VIEW_NAME),
  ];

  it('uses mobile view when mobile layout is active', () => {
    expect(
      resolveActiveDealBoardView({
        views,
        activeViewId: 'desktop',
        mobileLayoutActive: true,
      })?.id,
    ).toBe('mobile');
  });

  it('keeps desktop selection when mobile layout is inactive', () => {
    expect(
      resolveActiveDealBoardView({
        views,
        activeViewId: 'desktop',
        mobileLayoutActive: false,
      })?.id,
    ).toBe('desktop');
  });

  it('falls back to default desktop view when mobile view is missing', () => {
    expect(
      resolveActiveDealBoardView({
        views: [makeView('desktop', 'Будущие сделки', true)],
        activeViewId: undefined,
        mobileLayoutActive: true,
      })?.id,
    ).toBe('desktop');
  });
});
