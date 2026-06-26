import { useCallback, useEffect, useRef, useState } from 'react';

import type { ExpandMode } from './useExpandMode';
import type { LineItemRow } from '../types';
import { readSessionStorage, writeSessionStorage } from '../utils/browser-storage';
import {
  clearOverridesForMode,
  computeIsExpanded,
  EMPTY_EXPAND_OVERRIDES,
  parseExpandOverrides,
  toggleExpandOverride,
  type ExpandOverrides,
} from '../utils/smart-expand';

const EXPAND_OVERRIDES_STORAGE_PREFIX = 'deals-board-expand-overrides';

export const useDealExpandState = (
  activeViewId: string | undefined,
  lineItemsByOpportunity: Map<string, LineItemRow[]>,
  mode: ExpandMode,
) => {
  const storageKey = activeViewId ? `${EXPAND_OVERRIDES_STORAGE_PREFIX}:${activeViewId}` : null;
  const [overrides, setOverrides] = useState<ExpandOverrides>(EMPTY_EXPAND_OVERRIDES);
  const previousModeRef = useRef(mode);

  useEffect(() => {
    if (!storageKey) {
      setOverrides(EMPTY_EXPAND_OVERRIDES);
      return;
    }

    setOverrides(parseExpandOverrides(readSessionStorage(storageKey)));
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    writeSessionStorage(storageKey, JSON.stringify(overrides));
  }, [overrides, storageKey]);

  useEffect(() => {
    const previousMode = previousModeRef.current;
    if (previousMode === mode) {
      return;
    }

    previousModeRef.current = mode;
    setOverrides((current) => clearOverridesForMode(current, mode));
  }, [mode]);

  const isExpanded = useCallback(
    (opportunityId: string) => {
      const items = lineItemsByOpportunity.get(opportunityId) ?? [];
      return computeIsExpanded(opportunityId, items, mode, overrides);
    },
    [lineItemsByOpportunity, mode, overrides],
  );

  const toggleExpand = useCallback(
    (opportunityId: string) => {
      const items = lineItemsByOpportunity.get(opportunityId) ?? [];
      setOverrides((current) => toggleExpandOverride(opportunityId, items, mode, current));
    },
    [lineItemsByOpportunity, mode],
  );

  return {
    isExpanded,
    toggleExpand,
  };
};