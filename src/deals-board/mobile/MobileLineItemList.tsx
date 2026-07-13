import type { LineItemQueryFilters } from '../api/line-items';
import type { FieldDescriptor } from '../metadata/types';
import type { ColumnConfig, LineItemRow } from '../types';
import { MobileLineItemRow } from './MobileLineItemRow';

type MobileLineItemListProps = {
  opportunityId: string;
  items: LineItemRow[];
  columns: ColumnConfig[];
  descriptorByField: Map<string, FieldDescriptor>;
  filters?: LineItemQueryFilters;
};

export const MobileLineItemList = ({
  items,
  columns,
  descriptorByField,
}: MobileLineItemListProps) => {
  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: 8 }}>
      {items.map((item) => (
        <MobileLineItemRow
          key={item.id}
          item={item}
          columns={columns}
          descriptorByField={descriptorByField}
        />
      ))}
    </div>
  );
};
