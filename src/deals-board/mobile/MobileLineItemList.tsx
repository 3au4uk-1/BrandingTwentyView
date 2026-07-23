import type { LineItemQueryFilters } from '../api/line-items';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';
import { MobileLineItemRow } from './MobileLineItemRow';

type MobileLineItemListProps = {
  opportunityId: string;
  items: LineItemRow[];
  columns: ColumnConfig[];
  groups: ColumnGroupConfig[];
  descriptorByField: Map<string, FieldDescriptor>;
  filters?: LineItemQueryFilters;
};

export const MobileLineItemList = ({
  items,
  columns,
  groups,
  descriptorByField,
}: MobileLineItemListProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: spacing.md }}>
      <div
        style={{
          fontSize: font.sizeXs,
          fontWeight: font.weightSemibold,
          color: colors.textMuted,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          marginBottom: spacing.xs,
        }}
      >
        Позиции · {items.length}
      </div>
      <div
        style={{
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: theme.radius.md,
          backgroundColor: theme.colors.bg,
          padding: `0 ${spacing.sm}`,
        }}
      >
        {items.map((item, index) => (
          <MobileLineItemRow
            key={item.id}
            item={item}
            columns={columns}
            groups={groups}
            descriptorByField={descriptorByField}
            isLast={index === items.length - 1}
          />
        ))}
      </div>
    </div>
  );
};
