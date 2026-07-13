import type { RefObject } from 'react';

import type { LayoutMode } from '../utils/layout-mode';
import { useShouldUseMobileLayout } from './useShouldUseMobileLayout';

/** @deprecated Prefer useShouldUseMobileLayout — kept for existing imports. */
export const useLayoutMode = (containerRef: RefObject<HTMLElement | null>): LayoutMode => {
  return useShouldUseMobileLayout(containerRef) ? 'mobile' : 'desktop';
};
