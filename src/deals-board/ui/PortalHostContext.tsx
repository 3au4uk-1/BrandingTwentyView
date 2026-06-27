import { createContext, useContext, type ReactNode, type RefObject } from 'react';

const PortalHostContext = createContext<RefObject<HTMLElement | null> | null>(null);

type PortalHostProviderProps = {
  hostRef: RefObject<HTMLElement | null>;
  children: ReactNode;
};

export const PortalHostProvider = ({ hostRef, children }: PortalHostProviderProps) => (
  <PortalHostContext.Provider value={hostRef}>{children}</PortalHostContext.Provider>
);

export const usePortalHost = (): RefObject<HTMLElement | null> | null =>
  useContext(PortalHostContext);

/** Resolve a portal container without relying on document.getElementById in the worker. */
export const resolvePortalContainer = (
  target: 'body' | 'root',
  portalHostRef: RefObject<HTMLElement | null> | null,
): Element | null => {
  if (target === 'root') {
    return portalHostRef?.current ?? null;
  }

  if (typeof document === 'undefined') return null;

  const body = document.body;
  return body && typeof body === 'object' ? body : null;
};
