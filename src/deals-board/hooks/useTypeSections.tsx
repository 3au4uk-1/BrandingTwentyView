import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { readLocalStorage, writeLocalStorage } from '../utils/browser-storage';

export type TypeSectionsMode = 'on' | 'off';

export const TYPE_SECTIONS_STORAGE_KEY = 'deals-board-type-sections';

type TypeSectionsContextValue = {
  enabled: boolean;
  setEnabled: (next: boolean) => void;
};

const TypeSectionsContext = createContext<TypeSectionsContextValue | null>(null);

export const readTypeSectionsEnabled = (): boolean =>
  readLocalStorage(TYPE_SECTIONS_STORAGE_KEY) === 'on';

export const writeTypeSectionsEnabled = (enabled: boolean): void => {
  writeLocalStorage(TYPE_SECTIONS_STORAGE_KEY, enabled ? 'on' : 'off');
};

export const TypeSectionsProvider = ({ children }: { children: ReactNode }) => {
  const [enabled, setEnabledState] = useState(readTypeSectionsEnabled);

  const setEnabled = useCallback((next: boolean) => {
    writeTypeSectionsEnabled(next);
    setEnabledState(next);
  }, []);

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled]);

  return <TypeSectionsContext.Provider value={value}>{children}</TypeSectionsContext.Provider>;
};

export const useTypeSections = (): TypeSectionsContextValue => {
  const context = useContext(TypeSectionsContext);
  if (!context) {
    throw new Error('useTypeSections must be used within TypeSectionsProvider');
  }
  return context;
};
