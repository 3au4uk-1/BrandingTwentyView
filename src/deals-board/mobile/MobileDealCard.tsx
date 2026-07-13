import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import { DealSummaryChips } from '../DealsTable/DealSummaryChips';
import type { LineItemQueryFilters } from '../api/line-items';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { ChevronRightIcon } from '../ui/Icons';
import { visibleColumns } from '../utils/columns';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';
import type { ColumnConfig, LineItemRow, OpportunityRow } from '../types';
import { MobileLineItemList } from './MobileLineItemList';

type MobileDealCardProps = {
  row: OpportunityRow;
  lineItems: LineItemRow[];
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  parentDescriptorByField: Map<string, FieldDescriptor>;
  childDescriptorByField: Map<string, FieldDescriptor>;
  opportunityLinkFields: FieldDescriptor[];
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  lineItemFilters?: LineItemQueryFilters;
};

export const MobileDealCard = ({
  row,
  lineItems,
  parentColumns,
  childColumns,
  parentDescriptorByField,
  childDescriptorByField,
  opportunityLinkFields,
  isExpanded,
  onToggleExpand,
  lineItemFilters,
}: MobileDealCardProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius, colorScheme } = theme;
  const visibleParent = visibleColumns(parentColumns);
  const stageStyles = getStageRowStyles(typeof row.stage === 'string' ? row.stage : null, colorScheme, 'parent');
  const dealLineItems = lineItems.filter((item) => item.opportunityId === row.id);

  return (
    <div
      onClick={() => onToggleExpand(row.id)}
      style={{
        border: `1px solid ${colors.borderSubtle}`,
        borderLeft: `4px solid ${stageStyles.accentColor}`,
        borderRadius: radius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        backgroundColor: stageStyles.backgroundColor,
        cursor: 'pointer',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {visibleParent.map((column) => {
            if (column.field === 'summary') {
              return (
                <div key={column.field} style={{ marginTop: spacing.xs }}>
                  <DealSummaryChips items={dealLineItems} />
                </div>
              );
            }

            return (
              <div
                key={column.field}
                onClick={(event) => event.stopPropagation()}
                style={{ marginBottom: spacing.xs, fontSize: font.sizeSm }}
              >
                <DynamicFieldCell
                  objectName="opportunity"
                  recordId={row.id}
                  field={column.field}
                  descriptor={parentDescriptorByField.get(column.field)}
                  value={resolveFieldValue(row, column.field)}
                  variant="parent"
                  lineItems={dealLineItems}
                  isExpanded={isExpanded}
                  companyName={row.companyName}
                  row={row}
                  opportunityLinkFields={opportunityLinkFields}
                  onToggleExpand={onToggleExpand}
                />
              </div>
            );
          })}
        </div>
        <button
          type="button"
          data-expand-btn
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpand(row.id);
          }}
          aria-label={isExpanded ? 'Свернуть' : 'Развернуть'}
          style={{
            border: 'none',
            background: 'transparent',
            minWidth: 44,
            minHeight: 44,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            color: colors.textMuted,
            cursor: 'pointer',
          }}
        >
          <ChevronRightIcon size={18} color="currentColor" />
        </button>
      </div>
      {isExpanded ? (
        <div onClick={(event) => event.stopPropagation()}>
          <MobileLineItemList
            opportunityId={row.id}
            items={dealLineItems}
            columns={childColumns}
            descriptorByField={childDescriptorByField}
            filters={lineItemFilters}
          />
        </div>
      ) : null}
    </div>
  );
};
