import { useEffect, type RefObject } from 'react';

import { usePortalHost } from '../ui/PortalHostContext';

/**
 * Close a toolbar dropdown when the user interacts with the board body (table)
 * or presses Escape.
 *
 * Do NOT listen on the board root / window in capture phase: under Twenty Remote DOM
 * `contains`/`composedPath` cannot tell toolbar clicks from outside clicks, so a
 * root listener closes the menu on every interaction (View appears "broken").
 */
export const useOutsideDismiss = (
  open: boolean,
  _containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void => {
  const portalHostRef = usePortalHost();

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss();
    };

    const onBodyPointerDown = () => {
      onDismiss();
    };

    const root = portalHostRef?.current ?? null;
    let body: Element | null = null;
    try {
      if (root && typeof (root as { querySelector?: unknown }).querySelector === 'function') {
        body = (root as { querySelector: (sel: string) => Element | null }).querySelector(
          '[data-deals-board-body]',
        );
      }
    } catch {
      body = null;
    }
    if (!body && typeof document !== 'undefined') {
      try {
        body = document.querySelector('[data-deals-board-body]');
      } catch {
        body = null;
      }
    }

    body?.addEventListener?.('pointerdown', onBodyPointerDown);
    const view = typeof window !== 'undefined' ? window : undefined;
    view?.addEventListener?.('keydown', onKeyDown);

    return () => {
      body?.removeEventListener?.('pointerdown', onBodyPointerDown);
      view?.removeEventListener?.('keydown', onKeyDown);
    };
  }, [open, onDismiss, portalHostRef]);
};
