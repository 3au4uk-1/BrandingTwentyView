import type { PointerEvent as ReactPointerEvent } from 'react';

/** Reliable tap handler for touch devices in Remote DOM. */
export const createTapHandler =
  (action: () => void) => (event: ReactPointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    action();
  };
