import { useCallback, useEffect, useState } from 'react';

import { readLocalStorage, writeLocalStorage } from '../utils/browser-storage';

export const showAllPreferenceStorageKey = (viewId: string): string =>
  `deals-board-show-all:${viewId}`;

export const readShowAllPreference = (viewId: string | undefined): boolean => {
  if (!viewId) return false;
  return readLocalStorage(showAllPreferenceStorageKey(viewId)) === '1';
};

export const writeShowAllPreference = (viewId: string, showAll: boolean): void => {
  writeLocalStorage(showAllPreferenceStorageKey(viewId), showAll ? '1' : '0');
};

/** Per-user (localStorage) «Показать все» — not shared via dealBoardView.filters. */
export const useShowAllPreference = (viewId: string | undefined) => {
  const [showAll, setShowAllState] = useState(() => readShowAllPreference(viewId));

  useEffect(() => {
    setShowAllState(readShowAllPreference(viewId));
  }, [viewId]);

  const setShowAll = useCallback(
    (next: boolean) => {
      if (viewId) {
        writeShowAllPreference(viewId, next);
      }
      setShowAllState(next);
    },
    [viewId],
  );

  return { showAll, setShowAll };
};
