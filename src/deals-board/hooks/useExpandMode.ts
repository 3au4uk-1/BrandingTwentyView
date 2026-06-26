import { useCallback, useEffect, useState } from 'react';

import { readLocalStorage, writeLocalStorage } from '../utils/browser-storage';

export type ExpandMode = 'collapsed' | 'smart';

const STORAGE_KEY = 'deals-board-expand-mode';

export const useExpandMode = () => {
  const [mode, setModeState] = useState<ExpandMode>('collapsed');

  useEffect(() => {
    const stored = readLocalStorage(STORAGE_KEY);
    if (stored === 'smart') {
      setModeState('smart');
    }
  }, []);

  const setMode = useCallback((next: ExpandMode) => {
    writeLocalStorage(STORAGE_KEY, next);
    setModeState(next);
  }, []);

  return { mode, setMode };
};
