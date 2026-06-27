import { DONE_STAGES, type LineItemStage } from 'src/constants/stages';

import type { ExpandMode } from '../hooks/useExpandMode';
import type { LineItemRow } from '../types';

export type ExpandOverrides = {
  collapsed: string[];
  expanded: string[];
};

export const EMPTY_EXPAND_OVERRIDES: ExpandOverrides = {
  collapsed: [],
  expanded: [],
};

const DEFAULT_ACTIVE_STAGE: LineItemStage = 'NOVYY';

export const resolveLineItemStage = (stage?: LineItemStage | null): LineItemStage =>
  stage ?? DEFAULT_ACTIVE_STAGE;

export const hasActiveLineItems = (items: ReadonlyArray<Pick<LineItemRow, 'stage'>>): boolean =>
  items.some((item) => !DONE_STAGES.includes(resolveLineItemStage(item.stage)));

export const shouldAutoExpandDeal = (
  items: ReadonlyArray<Pick<LineItemRow, 'stage'>>,
  mode: ExpandMode,
): boolean => mode === 'smart' && items.length > 0 && hasActiveLineItems(items);

export const computeIsExpanded = (
  opportunityId: string,
  items: ReadonlyArray<Pick<LineItemRow, 'stage'>>,
  mode: ExpandMode,
  overrides: ExpandOverrides,
): boolean => {
  if (items.length === 0) {
    return false;
  }

  if (mode === 'smart') {
    if (overrides.collapsed.includes(opportunityId)) {
      return false;
    }

    if (overrides.expanded.includes(opportunityId)) {
      return true;
    }

    return hasActiveLineItems(items);
  }

  return overrides.expanded.includes(opportunityId);
};

export const parseExpandOverrides = (raw: string | null): ExpandOverrides => {
  if (!raw) {
    return EMPTY_EXPAND_OVERRIDES;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<ExpandOverrides>;
    const collapsed = Array.isArray(parsed.collapsed)
      ? parsed.collapsed.filter((value): value is string => typeof value === 'string')
      : [];
    const expanded = Array.isArray(parsed.expanded)
      ? parsed.expanded.filter((value): value is string => typeof value === 'string')
      : [];

    return { collapsed, expanded };
  } catch {
    return EMPTY_EXPAND_OVERRIDES;
  }
};

export const toggleExpandOverride = (
  opportunityId: string,
  items: ReadonlyArray<Pick<LineItemRow, 'stage'>>,
  mode: ExpandMode,
  overrides: ExpandOverrides,
): ExpandOverrides => {
  const isExpanded = computeIsExpanded(opportunityId, items, mode, overrides);
  const allDone = items.length > 0 && !hasActiveLineItems(items);

  if (mode === 'smart') {
    if (isExpanded) {
      if (allDone) {
        return {
          ...overrides,
          expanded: overrides.expanded.filter((id) => id !== opportunityId),
        };
      }

      return {
        ...overrides,
        collapsed: [...new Set([...overrides.collapsed, opportunityId])],
      };
    }

    if (allDone) {
      return {
        ...overrides,
        expanded: [...new Set([...overrides.expanded, opportunityId])],
      };
    }

    return {
      ...overrides,
      collapsed: overrides.collapsed.filter((id) => id !== opportunityId),
    };
  }

  if (isExpanded) {
    return {
      ...overrides,
      expanded: overrides.expanded.filter((id) => id !== opportunityId),
    };
  }

  return {
    ...overrides,
    expanded: [...new Set([...overrides.expanded, opportunityId])],
  };
};

export const clearOverridesForMode = (
  overrides: ExpandOverrides,
  mode: ExpandMode,
): ExpandOverrides =>
  mode === 'smart'
    ? { collapsed: [], expanded: [] }
    : { ...overrides, collapsed: [] };
