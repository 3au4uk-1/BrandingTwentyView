import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { readLocalStorage, writeLocalStorage } from '../utils/browser-storage';

export type ExpandMode = 'collapsed' | 'smart';

const STORAGE_KEY = 'deals-board-expand-mode';

type ExpandModeContextValue = {
  mode: ExpandMode;
  setMode: (next: ExpandMode) => void;
};

const ExpandModeContext = createContext<ExpandModeContextValue | null>(null);

const readStoredMode = (): ExpandMode => {
  const stored = readLocalStorage(STORAGE_KEY);
  return stored === 'collapsed' ? 'collapsed' : 'smart';
};

export const ExpandModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<ExpandMode>(readStoredMode);

  const setMode = useCallback((next: ExpandMode) => {
    writeLocalStorage(STORAGE_KEY, next);
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return <ExpandModeContext.Provider value={value}>{children}</ExpandModeContext.Provider>;
};

export const useExpandMode = (): ExpandModeContextValue => {
  const context = useContext(ExpandModeContext);
  if (!context) {
    throw new Error('useExpandMode must be used within ExpandModeProvider');
  }
  return context;
};
