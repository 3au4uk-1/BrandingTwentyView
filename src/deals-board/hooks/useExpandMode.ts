import { useCallback, useState } from 'react';

export type ExpandMode = 'collapsed' | 'smart';

const STORAGE_KEY = 'deals-board-expand-mode';

export const useExpandMode = () => {
  const [mode, setModeState] = useState<ExpandMode>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'smart' ? 'smart' : 'collapsed';
  });

  const setMode = useCallback((next: ExpandMode) => {
    localStorage.setItem(STORAGE_KEY, next);
    setModeState(next);
  }, []);

  return { mode, setMode };
};
