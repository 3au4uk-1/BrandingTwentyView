import type { ReactNode } from 'react';

import type { FieldDescriptor } from '../metadata/types';
import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';

import { GroupChipsCell } from './GroupChipsCell';

export type GroupColumnCellProps = {
  group: ColumnGroupConfig;
  members: ColumnConfig[];
  item: LineItemRow;
  descriptorByField: Map<string, FieldDescriptor>;
  renderMember?: (member: ColumnConfig, cell: ReactNode) => ReactNode;
  listMenuPresentation?: 'inline' | 'sheet';
  touchFriendly?: boolean;
  keepChipStyleWhenExpanded?: boolean;
};

export const GroupColumnCell = ({
  group,
  members,
  item,
}: GroupColumnCellProps) => (
  <GroupChipsCell groups={[{ group, members }]} item={item} />
);
