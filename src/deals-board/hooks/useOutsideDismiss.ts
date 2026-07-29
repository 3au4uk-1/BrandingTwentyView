import { useEffect, type RefObject } from 'react';

import { usePortalHost } from '../ui/PortalHostContext';

const OUTSIDE_DISMISS_ATTR = 'data-outside-dismiss';

const isInsideContainer = (
  container: HTMLElement | null,
  target: EventTarget | null,
): boolean => {
  if (!container || target == null) return false;

  try {
    if (typeof container.contains === 'function' && container.contains(target as Node)) {
      return true;
    }
  } catch {
    // Remote DOM event targets are often not real Nodes.
  }

  const maybeElement = target as { closest?: (selector: string) => Element | null };
  if (typeof maybeElement.closest === 'function') {
    try {
      return maybeElement.closest(`[${OUTSIDE_DISMISS_ATTR}]`) === container;
    } catch {
      return false;
    }
  }

  return false;
};

/**
 * Close a toolbar dropdown when the user presses outside it.
 * Listens on the board root (capture) as well as window — Remote DOM often
 * does not deliver `window` outside-clicks reliably, and `contains(Node)` throws.
 */
export const useOutsideDismiss = (
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void => {
  const portalHostRef = usePortalHost();

  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    if (container) {
      try {
        container.setAttribute(OUTSIDE_DISMISS_ATTR, '');
      } catch {
        // ignore
      }
    }

    const onPointerDown = (event: Event) => {
      if (isInsideContainer(containerRef.current, event.target)) return;
      onDismiss();
    };

    const boardRoot = portalHostRef?.current ?? null;
    boardRoot?.addEventListener?.('pointerdown', onPointerDown, true);
    boardRoot?.addEventListener?.('mousedown', onPointerDown, true);

    const view = typeof window !== 'undefined' ? window : undefined;
    view?.addEventListener?.('pointerdown', onPointerDown, true);
    view?.addEventListener?.('mousedown', onPointerDown, true);

    return () => {
      try {
        container?.removeAttribute?.(OUTSIDE_DISMISS_ATTR);
      } catch {
        // ignore
      }
      boardRoot?.removeEventListener?.('pointerdown', onPointerDown, true);
      boardRoot?.removeEventListener?.('mousedown', onPointerDown, true);
      view?.removeEventListener?.('pointerdown', onPointerDown, true);
      view?.removeEventListener?.('mousedown', onPointerDown, true);
    };
  }, [open, onDismiss, containerRef, portalHostRef]);
};
