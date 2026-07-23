import type { MouseEvent } from 'react';

import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import { DealSummaryChips } from '../DealsTable/DealSummaryChips';
import type { LineItemQueryFilters } from '../api/line-items';
import { Chip, type ChipColor } from '../Chip';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { ChevronRightIcon, ExternalLinkIcon } from '../ui/Icons';
import { visibleColumns } from '../utils/columns';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';
import { openRecordSidePanel } from '../utils/open-record-side-panel';
import type {
  ColumnConfig,
  ColumnGroupConfig,
  LineItemRow,
  OpportunityRow,
} from '../types';
import {
  getOpportunityStageColor,
  getOpportunityStageLabel,
} from 'src/constants/stages';

import { MobileFieldStack } from './MobileFieldStack';
import { MobileLineItemList } from './MobileLineItemList';
import {
  formatCompactDealDate,
  MOBILE_DEAL_META_FIELDS,
  partitionColumns,
} from './mobile-field-layout';

type MobileDealCardProps = {
  row: OpportunityRow;
  lineItems: LineItemRow[];
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  childGroups: ColumnGroupConfig[];
  parentDescriptorByField: Map<string, FieldDescriptor>;
  childDescriptorByField: Map<string, FieldDescriptor>;
  opportunityLinkFields: FieldDescriptor[];
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  lineItemFilters?: LineItemQueryFilters;
};

const renderParentField = (
  row: OpportunityRow,
  column: ColumnConfig,
  props: Pick<
    MobileDealCardProps,
    'parentDescriptorByField' | 'opportunityLinkFields' | 'onToggleExpand'
  >,
  dealLineItems: LineItemRow[],
  isExpanded: boolean,
) => (
  <DynamicFieldCell
    objectName="opportunity"
    recordId={row.id}
    field={column.field}
    descriptor={props.parentDescriptorByField.get(column.field)}
    value={resolveFieldValue(row, column.field)}
    variant="parent"
    lineItems={dealLineItems}
    isExpanded={isExpanded}
    companyName={row.companyName}
    row={row}
    opportunityLinkFields={props.opportunityLinkFields}
    onToggleExpand={props.onToggleExpand}
    listMenuPresentation="sheet"
    touchFriendly
  />
);

export const MobileDealCard = ({
  row,
  lineItems,
  parentColumns,
  childColumns,
  childGroups,
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
  const { meta, detail } = partitionColumns(visibleParent, ['name'], MOBILE_DEAL_META_FIELDS);
  const stageStyles = getStageRowStyles(
    typeof row.stage === 'string' ? row.stage : null,
    colorScheme,
    'parent',
  );
  const dealLineItems = lineItems.filter((item) => item.opportunityId === row.id);
  const dealName = typeof row.name === 'string' && row.name.trim() ? row.name : 'Без названия';
  const stageValue = typeof row.stage === 'string' ? row.stage : null;
  const compactDate = formatCompactDealDate(row.loadDate);
  const showSummary = meta.some((column) => column.field === 'summary');
  const showStageChip = meta.some((column) => column.field === 'stage') && stageValue;
  const showDate = meta.some((column) => column.field === 'loadDate') && compactDate;

  const fieldProps = {
    parentDescriptorByField,
    childDescriptorByField,
    opportunityLinkFields,
    onToggleExpand,
    lineItemFilters,
  };

  const handleToggleExpand = () => onToggleExpand(row.id);

  const handleOpenRecord = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void openRecordSidePanel('opportunity', row.id);
  };

  return (
    <article
      style={{
        border: `1px solid ${colors.borderSubtle}`,
        borderLeft: `3px solid ${stageStyles.accentColor}`,
        borderRadius: radius.lg,
        marginBottom: spacing.md,
        backgroundColor: colors.bgElevated,
        overflow: 'hidden',
        boxShadow: colors.shadow,
      }}
    >
      <div style={{ padding: spacing.md }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: spacing.sm }}>
          <button
            type="button"
            onClick={handleToggleExpand}
            aria-expanded={isExpanded}
            aria-label={isExpanded ? 'Свернуть сделку' : 'Развернуть сделку'}
            style={{
              border: 'none',
              background: 'transparent',
              minWidth: 36,
              minHeight: 36,
              marginTop: 2,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
              color: colors.textMuted,
              cursor: 'pointer',
              flexShrink: 0,
              touchAction: 'manipulation',
              transition: 'transform 0.15s ease',
            }}
          >
            <ChevronRightIcon size={16} color="currentColor" />
          </button>

          <button
            type="button"
            onClick={handleToggleExpand}
            style={{
              flex: 1,
              minWidth: 0,
              border: 'none',
              background: 'transparent',
              padding: 0,
              margin: 0,
              textAlign: 'left',
              cursor: 'pointer',
              color: 'inherit',
              touchAction: 'manipulation',
            }}
          >
            <div
              style={{
                fontSize: font.sizeMd,
                fontWeight: font.weightSemibold,
                color: colors.text,
                lineHeight: 1.35,
                display: '-webkit-box',
                WebkitLineClamp: isExpanded ? undefined : 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {dealName}
            </div>
          </button>

          <button
            type="button"
            onClick={handleOpenRecord}
            title="Открыть карточку"
            aria-label="Открыть карточку сделки"
            style={{
              border: 'none',
              background: 'transparent',
              minWidth: 40,
              minHeight: 40,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.accentText,
              cursor: 'pointer',
              flexShrink: 0,
              touchAction: 'manipulation',
            }}
          >
            <ExternalLinkIcon size={14} color="currentColor" />
          </button>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: spacing.sm,
            marginTop: spacing.sm,
            marginLeft: 44,
          }}
        >
          {showDate ? (
            <span
              style={{
                fontSize: font.sizeLg,
                fontWeight: font.weightSemibold,
                color: colors.text,
                lineHeight: 1,
              }}
            >
              {compactDate}
            </span>
          ) : null}
          {showStageChip ? (
            <Chip
              text={getOpportunityStageLabel(stageValue)}
              color={getOpportunityStageColor(stageValue) as ChipColor}
              theme={theme}
            />
          ) : null}
          {showSummary ? <DealSummaryChips items={dealLineItems} /> : null}
          {dealLineItems.length > 0 ? (
            <span style={{ fontSize: font.sizeXs, color: colors.textMuted }}>
              {dealLineItems.length} поз.
            </span>
          ) : null}
        </div>
      </div>

      {isExpanded ? (
        <div
          style={{
            borderTop: `1px solid ${colors.borderSubtle}`,
            backgroundColor: colors.bgNested,
            padding: `0 ${spacing.md} ${spacing.md}`,
          }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {detail.length > 0 || meta.some((column) => column.field !== 'summary') ? (
            <div style={{ paddingTop: spacing.sm }}>
              {meta
                .filter((column) => column.field !== 'summary')
                .map((column) => (
                  <MobileFieldStack key={column.field} label={column.label}>
                    {renderParentField(row, column, fieldProps, dealLineItems, isExpanded)}
                  </MobileFieldStack>
                ))}
              {detail.map((column) => (
                <MobileFieldStack key={column.field} label={column.label}>
                  {renderParentField(row, column, fieldProps, dealLineItems, isExpanded)}
                </MobileFieldStack>
              ))}
            </div>
          ) : null}

          <MobileLineItemList
            opportunityId={row.id}
            items={dealLineItems}
            columns={childColumns}
            groups={childGroups}
            descriptorByField={childDescriptorByField}
            filters={lineItemFilters}
          />
        </div>
      ) : null}
    </article>
  );
};
