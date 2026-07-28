import {
  isPrintFieldGroupMember,
  PRINT_FIELD_GROUP_ID,
} from 'src/constants/print-field-group';
import { DEFAULT_CHILD_COLUMNS } from 'src/constants/column-definitions';
import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';

export type GroupChipMode = 'name' | 'name+status';

export type GroupChipStatus = 'gotovo' | 'vzyato';

export type ChildLayoutColumn =
  | ColumnConfig
  | { type: 'group'; group: ColumnGroupConfig; members: ColumnConfig[] };

export const partitionUngroupedAndGroups = (
  layout: ChildLayoutColumn[],
): {
  ungrouped: ColumnConfig[];
  groupEntries: Array<Extract<ChildLayoutColumn, { type: 'group' }>>;
} => {
  const ungrouped: ColumnConfig[] = [];
  const groupEntries: Array<Extract<ChildLayoutColumn, { type: 'group' }>> = [];

  for (const entry of layout) {
    if ('type' in entry) {
      groupEntries.push(entry);
    } else {
      ungrouped.push(entry);
    }
  }

  return { ungrouped, groupEntries };
};

export const buildDefaultChildGroups = (): ColumnGroupConfig[] => [
  { id: PRINT_FIELD_GROUP_ID, name: 'Печать Плёнки', order: 0 },
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
  const seededFields = new Set(seededColumns.map((column) => column.field));
  const nextOrder = seededColumns.reduce((max, column) => Math.max(max, column.order), -1) + 1;
  const missingPrintColumns = DEFAULT_CHILD_COLUMNS.filter(
    (column) => isPrintFieldGroupMember(column.field) && !seededFields.has(column.field),
  ).map((column, index) => ({ ...column, order: nextOrder + index }));

  return { columns: [...seededColumns, ...missingPrintColumns], groups: seededGroups };
};

export const buildChildLayoutColumns = (
  columns: ColumnConfig[],
  groups: ColumnGroupConfig[],
): ChildLayoutColumn[] => {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const visibleColumns = columns
    .filter((column) => column.visible)
    .sort((a, b) => a.order - b.order);
  const groupEntries = groups
    .map((group) => ({
      type: 'group' as const,
      group,
      members: visibleColumns
        .filter((member) => member.groupId === group.id)
        .sort((a, b) => a.order - b.order),
    }))
    .filter((entry) => entry.members.length > 0)
    .sort(
      (a, b) =>
        a.group.order - b.group.order || a.group.name.localeCompare(b.group.name, 'ru'),
    );
  const emittedSourceGroupIds = new Set<string>();
  const layout: ChildLayoutColumn[] = [];
  let nextGroupIndex = 0;

  for (const column of visibleColumns) {
    if (!column.groupId) {
      layout.push(column);
      continue;
    }

    const group = groupById.get(column.groupId);
    if (!group || emittedSourceGroupIds.has(group.id)) {
      continue;
    }

    emittedSourceGroupIds.add(group.id);
    const orderedGroupEntry = groupEntries[nextGroupIndex++];
    if (orderedGroupEntry) layout.push(orderedGroupEntry);
  }

  return layout;
};

export const getVisibleFieldsForChildLayoutEntry = (
  layout: ChildLayoutColumn[],
  entry: ChildLayoutColumn,
): string[] =>
  'type' in entry
    ? entry.members.map(({ field }) => field)
    : layout.filter((candidate) => !('type' in candidate)).map(({ field }) => field);

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
