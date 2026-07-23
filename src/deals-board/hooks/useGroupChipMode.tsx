import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { readLocalStorage, writeLocalStorage } from '../utils/browser-storage';

export type GroupChipMode = 'name' | 'name+status';

const STORAGE_KEY = 'deals-board-group-chip-mode';

type GroupChipModeContextValue = {
  mode: GroupChipMode;
  setMode: (next: GroupChipMode) => void;
};

const GroupChipModeContext = createContext<GroupChipModeContextValue | null>(null);

const readStoredMode = (): GroupChipMode =>
  readLocalStorage(STORAGE_KEY) === 'name' ? 'name' : 'name+status';

export const GroupChipModeProvider = ({ children }: { children: ReactNode }) => {
  const [mode, setModeState] = useState<GroupChipMode>(readStoredMode);

  const setMode = useCallback((next: GroupChipMode) => {
    writeLocalStorage(STORAGE_KEY, next);
    setModeState(next);
  }, []);

  const value = useMemo(() => ({ mode, setMode }), [mode, setMode]);

  return <GroupChipModeContext.Provider value={value}>{children}</GroupChipModeContext.Provider>;
};

export const useGroupChipMode = (): GroupChipModeContextValue => {
  const context = useContext(GroupChipModeContext);
  if (!context) {
    throw new Error('useGroupChipMode must be used within GroupChipModeProvider');
  }
  return context;
};
