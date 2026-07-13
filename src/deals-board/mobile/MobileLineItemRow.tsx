import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { visibleColumns } from '../utils/columns';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';
import type { ColumnConfig, LineItemRow } from '../types';

type MobileLineItemRowProps = {
  item: LineItemRow;
  columns: ColumnConfig[];
  descriptorByField: Map<string, FieldDescriptor>;
};

export const MobileLineItemRow = ({ item, columns, descriptorByField }: MobileLineItemRowProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius, colorScheme } = theme;
  const visible = visibleColumns(columns);
  const stageStyles = getStageRowStyles(item.stage ?? null, colorScheme, 'child');

  return (
    <div
      style={{
        border: `1px solid ${colors.borderSubtle}`,
        borderLeft: `3px solid ${stageStyles.accentColor}`,
        borderRadius: radius.md,
        padding: spacing.sm,
        marginBottom: spacing.sm,
        backgroundColor: stageStyles.backgroundColor,
      }}
    >
      {visible.map((column) => (
        <div
          key={column.field}
          style={{
            display: 'flex',
            gap: spacing.sm,
            alignItems: 'flex-start',
            minHeight: 44,
            padding: `${spacing.xs} 0`,
            fontSize: font.sizeSm,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <span style={{ color: colors.textMuted, minWidth: 72, flexShrink: 0 }}>{column.label}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <DynamicFieldCell
              objectName="dealLineItem"
              recordId={item.id}
              field={column.field}
              descriptor={descriptorByField.get(column.field)}
              value={resolveFieldValue(item, column.field)}
              variant="child"
              row={item}
              listMenuPresentation="sheet"
            />
          </div>
        </div>
      ))}
    </div>
  );
};
