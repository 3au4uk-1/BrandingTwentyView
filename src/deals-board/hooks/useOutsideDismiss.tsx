import { useEffect, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';

import { useTheme } from '../theme/ThemeContext';
import { resolvePortalContainer, usePortalHost } from '../ui/PortalHostContext';

/**
 * Toolbar dropdown dismiss for Twenty Remote DOM.
 *
 * Event listeners on window/root cannot reliably tell "inside menu" from
 * "outside" (contains/composedPath break), and closing on board-body alone
 * often never fires. Instead: paint a full-board transparent backdrop under
 * the open menu; clicks on the backdrop dismiss, clicks on the menu do not.
 *
 * Returns a portal node — render it next to the dropdown trigger.
 */
export const useOutsideDismiss = (
  open: boolean,
  containerRef: RefObject<HTMLElement | null>,
  onDismiss: () => void,
): ReactNode => {
  const portalHostRef = usePortalHost();
  const { zIndex } = useTheme();

  useEffect(() => {
    const el = containerRef.current;
    if (!open || !el) return;

    const prevZ = el.style.zIndex;
    const prevPosition = el.style.position;
    if (!prevPosition || prevPosition === 'static') {
      el.style.position = 'relative';
    }
    // Above the backdrop (dropdown - 1) so the menu stays clickable.
    el.style.zIndex = String(zIndex.dropdown + 1);

    return () => {
      el.style.zIndex = prevZ;
      if (!prevPosition || prevPosition === 'static') {
        el.style.position = prevPosition;
      }
    };
  }, [open, containerRef, zIndex.dropdown]);

  if (!open) return null;

  const backdrop = (
    <div
      data-toolbar-dismiss-backdrop
      aria-hidden="true"
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onDismiss();
      }}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: zIndex.dropdown - 1,
      }}
    />
  );

  const container = resolvePortalContainer('root', portalHostRef);
  return container ? createPortal(backdrop, container) : backdrop;
};
