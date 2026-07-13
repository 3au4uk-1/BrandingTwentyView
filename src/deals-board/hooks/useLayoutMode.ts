import { useMemo, type RefObject } from 'react';

import { resolveLayoutMode, type LayoutMode } from '../utils/layout-mode';
import { resolveLayoutEffectiveWidth } from '../utils/viewport-width';
import { useContainerWidth } from './useContainerWidth';
import { usePrefersMobileViewport, useViewportWidth } from './useViewportWidth';

export const useLayoutMode = (containerRef: RefObject<HTMLElement | null>): LayoutMode => {
  const containerWidth = useContainerWidth(containerRef);
  const viewportWidth = useViewportWidth(containerRef);
  const prefersMobile = usePrefersMobileViewport();

  const effectiveWidth = useMemo(
    () => resolveLayoutEffectiveWidth(containerWidth, viewportWidth),
    [containerWidth, viewportWidth],
  );

  return useMemo(
    () => resolveLayoutMode(effectiveWidth, { prefersMobile }),
    [effectiveWidth, prefersMobile],
  );
};
