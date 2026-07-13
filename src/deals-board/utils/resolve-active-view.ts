import type { DealBoardViewRecord } from '../types';
import { MOBILE_VIEW_NAME } from 'src/constants/mobile-view';

export const findMobileDealBoardView = (
  views: DealBoardViewRecord[],
): DealBoardViewRecord | undefined =>
  views.find((view) => view.name === MOBILE_VIEW_NAME);

export const resolveActiveDealBoardView = (params: {
  views: DealBoardViewRecord[];
  activeViewId?: string;
  mobileLayoutActive: boolean;
}): DealBoardViewRecord | undefined => {
  const { views, activeViewId, mobileLayoutActive } = params;
  if (!views.length) return undefined;

  if (mobileLayoutActive) {
    const mobileView = findMobileDealBoardView(views);
    if (mobileView) return mobileView;
  }

  if (activeViewId) {
    const selected = views.find((view) => view.id === activeViewId);
    if (selected) return selected;
  }

  return views.find((view) => view.isDefault) ?? views[0];
};
