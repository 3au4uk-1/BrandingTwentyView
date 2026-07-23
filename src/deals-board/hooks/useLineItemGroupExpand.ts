import { useCallback, useState } from 'react';

import { readLocalStorage, writeLocalStorage } from '../utils/browser-storage';

const STORAGE_KEY = 'deals-board-line-item-group-expand';

type GroupExpandState = Record<string, boolean>;

export const toggleGroupExpandKey = (
  state: GroupExpandState,
  lineItemId: string,
  groupId: string,
): GroupExpandState => {
  const key = `${lineItemId}:${groupId}`;
  return { ...state, [key]: !state[key] };
};

const readStoredState = (): GroupExpandState => {
  const stored = readLocalStorage(STORAGE_KEY);
  if (!stored) return {};

  try {
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};

    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
    );
  } catch {
    return {};
  }
};

export const useLineItemGroupExpand = () => {
  const [state, setState] = useState<GroupExpandState>(readStoredState);

  const isExpanded = useCallback(
    (lineItemId: string, groupId: string) => Boolean(state[`${lineItemId}:${groupId}`]),
    [state],
  );

  const toggle = useCallback((lineItemId: string, groupId: string) => {
    setState((current) => {
      const next = toggleGroupExpandKey(current, lineItemId, groupId);
      writeLocalStorage(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { isExpanded, toggle };
};
