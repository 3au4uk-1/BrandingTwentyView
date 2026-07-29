import type { ColumnConfig } from '../types';

export const pinChildColumnFirst = (
  columns: ColumnConfig[],
  field: string,
): ColumnConfig[] => {
  const target = columns.find((column) => column.field === field);
  if (!target) return columns;

  const rest = columns.filter((column) => column.field !== field);
  return [
    { ...target, visible: true, order: 0 },
    ...rest.map((column, index) => ({ ...column, order: index + 1 })),
  ];
};
