import { useMemo, type RefObject } from 'react';

import { resolveLayoutMode, type LayoutMode } from '../utils/layout-mode';
import { useContainerWidth } from './useContainerWidth';

export const useLayoutMode = (containerRef: RefObject<HTMLElement | null>): LayoutMode => {
  const containerWidth = useContainerWidth(containerRef);
  return useMemo(() => resolveLayoutMode(containerWidth), [containerWidth]);
};
