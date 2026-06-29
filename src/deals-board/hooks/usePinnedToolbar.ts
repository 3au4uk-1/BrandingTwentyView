import { useLayoutEffect, useState, type CSSProperties } from 'react';

import { DEALS_BOARD_ROOT_ID, DEALS_BOARD_TOOLBAR_ID, isMeasurableElement } from '../utils/dom';

type PinnedToolbarState = {
  isPinned: boolean;
  toolbarStyle: CSSProperties | undefined;
  placeholderHeight: number;
};

const addPassiveListener = (
  target: Window | Document | null | undefined,
  type: string,
  listener: () => void,
  options?: boolean | AddEventListenerOptions,
) => {
  if (!target || typeof target.addEventListener !== 'function') return;
  target.addEventListener(type, listener, options);
};

const removePassiveListener = (
  target: Window | Document | null | undefined,
  type: string,
  listener: () => void,
  options?: boolean | EventListenerOptions,
) => {
  if (!target || typeof target.removeEventListener !== 'function') return;
  target.removeEventListener(type, listener, options);
};

const getBoardRoot = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  const element = document.getElementById(DEALS_BOARD_ROOT_ID);
  return isMeasurableElement(element) ? element : null;
};

const getToolbar = (): HTMLElement | null => {
  if (typeof document === 'undefined') return null;
  const element = document.getElementById(DEALS_BOARD_TOOLBAR_ID);
  return isMeasurableElement(element) ? element : null;
};

export const usePinnedToolbar = (pinTop = 0, zIndex = 30): PinnedToolbarState => {
  const [state, setState] = useState<PinnedToolbarState>({
    isPinned: false,
    toolbarStyle: undefined,
    placeholderHeight: 0,
  });

  useLayoutEffect(() => {
    const documentRef = typeof document === 'undefined' ? null : document;
    if (!documentRef) return;

    const view = documentRef.defaultView;

    const update = () => {
      const root = getBoardRoot();
      const toolbar = getToolbar();
      if (!root || !toolbar) {
        setState({ isPinned: false, toolbarStyle: undefined, placeholderHeight: 0 });
        return;
      }

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

    addPassiveListener(documentRef, 'scroll', update, { passive: true, capture: true });
    addPassiveListener(view, 'scroll', update, { passive: true });
    addPassiveListener(view, 'resize', update);

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : undefined;
    const root = getBoardRoot();
    const toolbar = getToolbar();
    if (root) observer?.observe(root);
    if (toolbar) observer?.observe(toolbar);

    update();

    return () => {
      removePassiveListener(documentRef, 'scroll', update, { capture: true });
      removePassiveListener(view, 'scroll', update);
      removePassiveListener(view, 'resize', update);
      observer?.disconnect();
    };
  }, [pinTop, zIndex]);

  return state;
};
