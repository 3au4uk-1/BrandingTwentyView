import {
  isPrintFieldGroupMember,
  PRINT_FIELD_GROUP_ID,
} from 'src/constants/print-field-group';
import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';

export type GroupChipMode = 'name' | 'name+status';

export type GroupChipStatus = 'gotovo' | 'vzyato';

export type ChildLayoutColumn =
  | ColumnConfig
  | { type: 'group'; group: ColumnGroupConfig; members: ColumnConfig[] };

export const buildDefaultChildGroups = (): ColumnGroupConfig[] => [
  { id: PRINT_FIELD_GROUP_ID, name: 'Печать', order: 0 },
];

export const applyPrintGroupSeed = (
  columns: ColumnConfig[],
  groups: ColumnGroupConfig[],
): { columns: ColumnConfig[]; groups: ColumnGroupConfig[] } => {
  if (groups.length > 0) {
    return { columns, groups };
  }

  const seededGroups = buildDefaultChildGroups();
  const seededColumns = columns.map((column) =>
    isPrintFieldGroupMember(column.field)
      ? { ...column, groupId: PRINT_FIELD_GROUP_ID }
      : column,
  );

  return { columns: seededColumns, groups: seededGroups };
};

export const buildChildLayoutColumns = (
  columns: ColumnConfig[],
  groups: ColumnGroupConfig[],
): ChildLayoutColumn[] => {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const visibleColumns = columns.filter((column) => column.visible);
  const emittedGroupIds = new Set<string>();
  const layout: ChildLayoutColumn[] = [];

  for (const column of visibleColumns) {
    if (!column.groupId) {
      layout.push(column);
      continue;
    }

    const group = groupById.get(column.groupId);
    if (!group || emittedGroupIds.has(group.id)) {
      continue;
    }

    const members = visibleColumns
      .filter((member) => member.groupId === group.id)
      .sort((a, b) => a.order - b.order);

    if (members.length === 0) {
      continue;
    }

    emittedGroupIds.add(group.id);
    layout.push({ type: 'group', group, members });
  }

  return layout;
};

export const getGroupChipStatus = (
  members: ColumnConfig[],
  row: LineItemRow,
): GroupChipStatus | null => {
  const memberFields = new Set(members.map((member) => member.field));

  if (memberFields.has('gotovo') && row.gotovo === true) {
    return 'gotovo';
  }

  if (memberFields.has('vzatoVRabotu') && row.vzatoVRabotu === true) {
    return 'vzyato';
  }

  return null;
};

export const formatGroupChipLabel = (
  groupName: string,
  status: GroupChipStatus | null,
  mode: GroupChipMode,
): string => {
  if (mode === 'name' || !status) {
    return groupName;
  }

  const suffix = status === 'gotovo' ? 'готово' : 'взято';
  return `${groupName} · ${suffix}`;
};
