import type { ColumnConfig, ColumnGroupConfig } from '../types';
import { createId } from './create-id';

export const assignColumnGroup = (
  columns: ColumnConfig[],
  field: string,
  groupId?: string,
): ColumnConfig[] =>
  columns.map((column) => (column.field === field ? { ...column, groupId } : column));

export const deleteGroup = (
  columns: ColumnConfig[],
  groups: ColumnGroupConfig[],
  groupId: string,
): { columns: ColumnConfig[]; groups: ColumnGroupConfig[] } => ({
  columns: columns.map((column) =>
    column.groupId === groupId ? { ...column, groupId: undefined } : column,
  ),
  groups: groups
    .filter((group) => group.id !== groupId)
    .map((group, order) => ({ ...group, order })),
});

export const createGroup = (
  groups: ColumnGroupConfig[],
  name?: string,
): ColumnGroupConfig[] => [
  ...groups,
  {
    id: createId(),
    name: name?.trim() || `Печать ${groups.length + 1}`,
    order: groups.length,
  },
];

export const moveColumnWithinGroup = (
  columns: ColumnConfig[],
  field: string,
  direction: -1 | 1,
): ColumnConfig[] => {
  const column = columns.find((candidate) => candidate.field === field);
  if (!column) return columns;

  const peers = columns
    .filter((candidate) => candidate.groupId === column.groupId)
    .sort((a, b) => a.order - b.order);
  const index = peers.findIndex((candidate) => candidate.field === field);
  const other = peers[index + direction];
  if (!other) return columns;

  return columns.map((candidate) => {
    if (candidate.field === column.field) return { ...candidate, order: other.order };
    if (candidate.field === other.field) return { ...candidate, order: column.order };
    return candidate;
  });
};

export const moveGroup = (
  groups: ColumnGroupConfig[],
  groupId: string,
  direction: -1 | 1,
): ColumnGroupConfig[] => {
  const ordered = [...groups].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ru'),
  );
  const index = ordered.findIndex((group) => group.id === groupId);
  const nextIndex = index + direction;
  if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return groups;

  const [moved] = ordered.splice(index, 1);
  ordered.splice(nextIndex, 0, moved);
  return ordered.map((group, order) => ({ ...group, order }));
};
