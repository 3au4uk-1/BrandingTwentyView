import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { readLocalStorage, writeLocalStorage } from '../utils/browser-storage';
import {
  parseHiddenParserLabels,
  type ParserLabelId,
} from '../utils/parser-label-filter';

const STORAGE_KEY = 'deals-board-hidden-parser-labels';

type ParserLabelFilterContextValue = {
  hiddenIds: ReadonlySet<ParserLabelId>;
  isShown: (id: ParserLabelId) => boolean;
  toggle: (id: ParserLabelId) => void;
};

const ParserLabelFilterContext = createContext<ParserLabelFilterContextValue | null>(null);

export const ParserLabelFilterProvider = ({ children }: { children: ReactNode }) => {
  const [hiddenList, setHiddenList] = useState<ParserLabelId[]>(() =>
    parseHiddenParserLabels(readLocalStorage(STORAGE_KEY)),
  );

  const toggle = useCallback((id: ParserLabelId) => {
    setHiddenList((current) => {
      const next = current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id];
      writeLocalStorage(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const value = useMemo<ParserLabelFilterContextValue>(() => {
    const hiddenIds = new Set(hiddenList);
    return {
      hiddenIds,
      isShown: (id) => !hiddenIds.has(id),
      toggle,
    };
  }, [hiddenList, toggle]);

  return (
    <ParserLabelFilterContext.Provider value={value}>{children}</ParserLabelFilterContext.Provider>
  );
};

export const useParserLabelFilter = (): ParserLabelFilterContextValue => {
  const context = useContext(ParserLabelFilterContext);
  if (!context) {
    throw new Error('useParserLabelFilter must be used within ParserLabelFilterProvider');
  }
  return context;
};
