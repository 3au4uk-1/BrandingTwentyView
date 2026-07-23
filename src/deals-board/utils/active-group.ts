import type { ColumnConfig, ColumnGroupConfig } from '../types';

export type ColumnGroupEntry = {
  group: ColumnGroupConfig;
  members: ColumnConfig[];
};

export const findActiveGroupMembers = (
  groups: ColumnGroupEntry[],
  lineItemId: string,
  isExpanded: (lineItemId: string, groupId: string) => boolean,
): ColumnConfig[] | null => {
  for (const entry of groups) {
    if (isExpanded(lineItemId, entry.group.id)) {
      return entry.members;
    }
  }

  return null;
};
