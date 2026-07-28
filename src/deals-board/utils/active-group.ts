import { FREZA_FIELD_GROUP_ID } from 'src/constants/freza-field-group';
import { PRINT_FIELD_GROUP_ID } from 'src/constants/print-field-group';

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
    if (entry.group.id === PRINT_FIELD_GROUP_ID) continue;
    if (entry.group.id === FREZA_FIELD_GROUP_ID) continue;
    if (isExpanded(lineItemId, entry.group.id)) {
      return entry.members;
    }
  }

  return null;
};
