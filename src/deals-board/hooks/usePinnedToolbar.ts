import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

type PinnedToolbarState = {
  isPinned: boolean;
  toolbarStyle: CSSProperties | undefined;
  placeholderHeight: number;
};

const addPassiveListener = (
  target: Window | Document | Element | null | undefined,
  type: string,
  listener: () => void,
  options?: boolean | AddEventListenerOptions,
) => {
  if (!target || typeof target.addEventListener !== 'function') return;
  target.addEventListener(type, listener, options);
};

const removePassiveListener = (
  target: Window | Document | Element | null | undefined,
  type: string,
  listener: () => void,
  options?: boolean | EventListenerOptions,
) => {
  if (!target || typeof target.removeEventListener !== 'function') return;
  target.removeEventListener(type, listener, options);
};

export const usePinnedToolbar = (
  rootRef: RefObject<HTMLElement | null>,
  toolbarRef: RefObject<HTMLElement | null>,
  pinTop = 0,
  zIndex = 30,
): PinnedToolbarState => {
  const [state, setState] = useState<PinnedToolbarState>({
    isPinned: false,
    toolbarStyle: undefined,
    placeholderHeight: 0,
  });

  useLayoutEffect(() => {
    const root = rootRef.current;
    const toolbar = toolbarRef.current;
    const document = root?.ownerDocument;
    if (!root || !toolbar || !document) return;

    const view = document.defaultView;

    const update = () => {
      const rootRect = root.getBoundingClientRect();
      const toolbarHeight = toolbar.offsetHeight;
      const shouldPin = rootRect.top < pinTop && rootRect.bottom > toolbarHeight + pinTop;

      if (!shouldPin) {
        setState({ isPinned: false, toolbarStyle: undefined, placeholderHeight: 0 });
        return;
      }

      setState({
        isPinned: true,
        placeholderHeight: toolbarHeight,
        toolbarStyle: {
          position: 'fixed',
          top: pinTop,
          left: rootRect.left,
          width: rootRect.width,
          zIndex,
        },
      });
    };

    addPassiveListener(document, 'scroll', update, { passive: true, capture: true });
    addPassiveListener(view, 'scroll', update, { passive: true });
    addPassiveListener(view, 'resize', update);

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : undefined;
    observer?.observe(root);
    observer?.observe(toolbar);

    update();

    return () => {
      removePassiveListener(document, 'scroll', update, { capture: true });
      removePassiveListener(view, 'scroll', update);
      removePassiveListener(view, 'resize', update);
      observer?.disconnect();
    };
  }, [pinTop, rootRef, toolbarRef, zIndex]);

  return state;
};
