import { useEffect, useId, type RefObject } from 'react';

import { usePortalHost } from '../ui/PortalHostContext';

export const OUTSIDE_DISMISS_ATTR = 'data-outside-dismiss';

const readAttr = (value: unknown): string | null => {
  if (!value || typeof value !== 'object') return null;
  const el = value as { getAttribute?: (name: string) => string | null };
  if (typeof el.getAttribute !== 'function') return null;
  try {
    return el.getAttribute(OUTSIDE_DISMISS_ATTR);
  } catch {
    return null;
  }
};

/**
 * True when the event originated inside `container`.
 * Prefer `composedPath()` — Remote DOM often breaks `contains(Node)`.
 */
export const eventTargetsContainer = (
  container: HTMLElement | null | undefined,
  event: Event,
  dismissId?: string | null,
): boolean => {
  if (!container) return false;

  const path =
    typeof (event as { composedPath?: () => EventTarget[] }).composedPath === 'function'
      ? (event as { composedPath: () => EventTarget[] }).composedPath()
      : [];

  if (path.length > 0) {
    if (path.includes(container)) return true;
    if (dismissId) {
      for (const entry of path) {
        if (readAttr(entry) === dismissId) return true;
      }
    }
  }

  const target = event.target;
  try {
    if (
      target &&
      typeof container.contains === 'function' &&
      container.contains(target as Node)
    ) {
      return true;
    }
  } catch {
    // Remote DOM event targets are often not real Nodes.
  }

  if (dismissId && target && typeof (target as { closest?: unknown }).closest === 'function') {
    try {
      const match = (target as { closest: (sel: string) => Element | null }).closest(
        `[${OUTSIDE_DISMISS_ATTR}="${dismissId}"]`,
      );
      if (match) return true;
    } catch {
      // ignore
    }
  }

  return false;
};

/**
 * Close a toolbar dropdown when the user presses outside it.
 *
 * Remote DOM notes:
 * - `window` outside-clicks are unreliable → also listen on the board root
 * - `contains(Node)` often throws/lies → use `composedPath`
 * - sync dismiss on mousedown + trigger `onClick` toggle re-opens the menu → defer dismiss
 */
export const useOutsideDismiss = (
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): void => {
  const portalHostRef = usePortalHost();
  const dismissId = useId();

  useEffect(() => {
    if (!open) return;

    const container = containerRef.current;
    if (container) {
      try {
        container.setAttribute(OUTSIDE_DISMISS_ATTR, dismissId);
      } catch {
        // ignore
      }
    }

    let dismissTimer: ReturnType<typeof setTimeout> | null = null;

    const onPointerDown = (event: Event) => {
      if (eventTargetsContainer(containerRef.current, event, dismissId)) return;

      // Defer past the trigger's click handler. If `contains` misfires on the
      // toggle, sync dismiss+toggle would reopen the menu (false → true).
      if (dismissTimer != null) clearTimeout(dismissTimer);
      dismissTimer = setTimeout(() => {
        dismissTimer = null;
        onDismiss();
      }, 0);
    };

    const boardRoot = portalHostRef?.current ?? null;
    boardRoot?.addEventListener?.('pointerdown', onPointerDown, true);

    const view = typeof window !== 'undefined' ? window : undefined;
    view?.addEventListener?.('pointerdown', onPointerDown, true);

    return () => {
      if (dismissTimer != null) clearTimeout(dismissTimer);
      try {
        container?.removeAttribute?.(OUTSIDE_DISMISS_ATTR);
      } catch {
        // ignore
      }
      boardRoot?.removeEventListener?.('pointerdown', onPointerDown, true);
      view?.removeEventListener?.('pointerdown', onPointerDown, true);
    };
  }, [open, onDismiss, containerRef, portalHostRef, dismissId]);
};
