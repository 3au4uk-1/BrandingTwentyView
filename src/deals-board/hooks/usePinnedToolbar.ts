import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';

type PinnedToolbarState = {
  isPinned: boolean;
  toolbarStyle: CSSProperties | undefined;
  placeholderHeight: number;
};

const getScrollableAncestors = (element: HTMLElement): Array<Window | Element> => {
  const view = element.ownerDocument?.defaultView ?? window;
  const targets: Array<Window | Element> = [view];
  let current: HTMLElement | null = element.parentElement;

  while (current) {
    const { overflowY } = view.getComputedStyle(current);
    if (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') {
      targets.push(current);
    }
    current = current.parentElement;
  }

  return targets;
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
    if (!root || !toolbar) return;

    const view = root.ownerDocument?.defaultView ?? window;

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

    const scrollTargets = getScrollableAncestors(root);
    scrollTargets.forEach((target) => target.addEventListener('scroll', update, { passive: true }));
    view.addEventListener('resize', update);

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : undefined;
    observer?.observe(root);
    observer?.observe(toolbar);

    update();

    return () => {
      scrollTargets.forEach((target) => target.removeEventListener('scroll', update));
      view.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, [pinTop, rootRef, toolbarRef, zIndex]);

  return state;
};
