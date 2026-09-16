import { memo, type CSSProperties, type ReactNode } from 'react';

import { parentCellOverflow } from '../banner-crew/chip-layout';
import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import type { LineItemQueryFilters } from '../api/line-items';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { ChevronRightIcon } from '../ui/Icons';
import type {
  ChildSmetaRow,
  ColumnConfig,
  ColumnGroupConfig,
  LineItemRow,
  OpportunityLinkValue,
  OpportunityRow,
} from '../types';
import { getColumnWidth } from '../utils/columns';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageRowStyles } from '../utils/stage-row-styles';
import type { BoardStream } from 'src/constants/product-stream';
import { getOpportunityLinkButtonLabel } from 'src/constants/opportunity-links';
import { PARENT_EXPAND_COLUMN } from './build-parent-columns';
import { PARENT_EXPAND_COLUMN_FIELD } from './parent-table-sort';
import { LineItemsTable } from './LineItemsTable';

type DealRowProps = {
  row: OpportunityRow;
  companyName?: string;
  columns: ColumnConfig[];
  childColumns: ColumnConfig[];
  childGroups: ColumnGroupConfig[];
  parentDescriptorByField: Map<string, FieldDescriptor>;
  childDescriptorByField: Map<string, FieldDescriptor>;
  lineItems: LineItemRow[];
  allDealLineItems?: LineItemRow[];
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
  opportunityLinkFields: FieldDescriptor[];
  filters?: LineItemQueryFilters;
  hasLineItemFilters?: boolean;
  showAllPositions?: boolean;
  onToggleShowAllPositions?: (opportunityId: string) => void;
  onChildColumnResizeStart: (
    event: MouseEvent | PointerEvent,
    field: string,
    startWidth: number,
    scaleSource?: HTMLElement | null,
    captureTarget?: HTMLElement | null,
  ) => void;
  attentionHighlighted?: boolean;
  boardStream?: BoardStream;
};

const ExpandToggleButton = ({
  recordId,
  isExpanded,
  onToggleExpand,
}: {
  recordId: string;
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
}) => {
  const theme = useTheme();
  const { colors } = theme;

  return (
    <button
      type="button"
      data-expand-btn
      onClick={() => onToggleExpand(recordId)}
      style={{
        border: 'none',
        background: 'transparent',
        padding: '2px',
        width: '22px',
        minWidth: '22px',
        height: '22px',
        minHeight: '22px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: isExpanded ? colors.accentText : colors.textMuted,
        cursor: 'pointer',
        transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
        transition: 'transform 0.15s ease, color 0.12s ease, background-color 0.12s ease',
        flexShrink: 0,
      }}
      aria-label={isExpanded ? 'Свернуть позиции' : 'Развернуть позиции'}
    >
      <ChevronRightIcon size={14} color="currentColor" />
    </button>
  );
};

const collectLinkChips = (
  field: string,
  label: string,
  value: OpportunityLinkValue | undefined,
): Array<{ key: string; url: string; shortLabel: string; title: string }> => {
  const button = getOpportunityLinkButtonLabel(field, label);
  const chips: Array<{ key: string; url: string; shortLabel: string; title: string }> = [];
  const primary = value?.primaryLinkUrl?.trim();
  if (primary) {
    chips.push({
      key: `${field}-primary`,
      url: primary,
      shortLabel: button.shortLabel,
      title: value?.primaryLinkLabel?.trim() || button.title,
    });
  }
  const secondary = value?.secondaryLinks ?? [];
  secondary.forEach((link, index) => {
    const url = link.url?.trim();
    if (!url) return;
    chips.push({
      key: `${field}-secondary-${index}`,
      url,
      shortLabel: button.shortLabel,
      title: link.label?.trim() || `${button.title} ${index + 2}`,
    });
  });
  return chips;
};

const SmetaHeaderLinks = ({ smeta }: { smeta: ChildSmetaRow }) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const chips = [
    ...collectLinkChips('tonyLink', 'Tony', smeta.tonyLink),
    ...collectLinkChips('bitrixLink', 'Bitrix', smeta.bitrixLink),
  ];

  if (!chips.length) return null;

  return (
    <div style={{ display: 'inline-flex', gap: spacing.xs, flexWrap: 'wrap' }}>
      {chips.map((chip) => (
        <a
          key={chip.key}
          href={chip.url}
          target="_blank"
          rel="noreferrer"
          title={chip.title}
          data-link-chip
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            borderRadius: radius.sm,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.bgTertiary,
            color: colors.textSecondary,
            textDecoration: 'none',
            fontSize: font.sizeXs,
            fontWeight: font.weightSemibold,
          }}
        >
          {chip.shortLabel}
        </a>
      ))}
    </div>
  );
};

const ExpandedLineItems = ({
  row,
  lineItems,
  childColumns,
  childGroups,
  childDescriptorByField,
  filters,
  hasLineItemFilters,
  showAllPositions,
  onToggleShowAllPositions,
  onChildColumnResizeStart,
  boardStream,
}: {
  row: OpportunityRow;
  lineItems: LineItemRow[];
  childColumns: ColumnConfig[];
  childGroups: ColumnGroupConfig[];
  childDescriptorByField: Map<string, FieldDescriptor>;
  filters?: LineItemQueryFilters;
  hasLineItemFilters: boolean;
  showAllPositions: boolean;
  onToggleShowAllPositions?: (opportunityId: string) => void;
  onChildColumnResizeStart: DealRowProps['onChildColumnResizeStart'];
  boardStream?: BoardStream;
}): ReactNode => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const childSmetas = row.childSmetas;

  if (childSmetas?.length) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {childSmetas.map((smeta) => (
          <div key={smeta.id} data-smeta-id={smeta.id}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: spacing.sm,
                padding: `${spacing.sm} ${spacing.md}`,
                borderBottom: `1px solid ${colors.borderSubtle}`,
              }}
            >
              <div
                style={{
                  fontSize: font.sizeSm,
                  fontWeight: font.weightSemibold,
                  color: colors.text,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {smeta.name}
              </div>
              <SmetaHeaderLinks smeta={smeta} />
            </div>
            <LineItemsTable
              opportunityId={smeta.id}
              items={smeta.lineItems}
              columns={childColumns}
              groups={childGroups}
              descriptorByField={childDescriptorByField}
              filters={filters}
              hasLineItemFilters={hasLineItemFilters}
              showAllPositions={showAllPositions}
              onToggleShowAllPositions={
                onToggleShowAllPositions
                  ? () => onToggleShowAllPositions(smeta.id)
                  : undefined
              }
              onColumnResizeStart={onChildColumnResizeStart}
              boardStream={boardStream}
            />
          </div>
        ))}
      </div>
    );
  }

  return (
    <LineItemsTable
      opportunityId={row.id}
      items={lineItems}
      columns={childColumns}
      groups={childGroups}
      descriptorByField={childDescriptorByField}
      filters={filters}
      hasLineItemFilters={hasLineItemFilters}
      showAllPositions={showAllPositions}
      onToggleShowAllPositions={
        onToggleShowAllPositions ? () => onToggleShowAllPositions(row.id) : undefined
      }
      onColumnResizeStart={onChildColumnResizeStart}
      boardStream={boardStream}
    />
  );
};

export const DealRow = memo(function DealRow({
  row,
  companyName,
  columns,
  childColumns,
  childGroups,
  parentDescriptorByField,
  childDescriptorByField,
  lineItems,
  allDealLineItems,
  isExpanded,
  onToggleExpand,
  opportunityLinkFields,
  filters,
  hasLineItemFilters = false,
  showAllPositions = false,
  onToggleShowAllPositions,
  onChildColumnResizeStart,
  attentionHighlighted = false,
  boardStream,
}: DealRowProps) {
  const theme = useTheme();
  const { colors, font, zIndex, colorScheme } = theme;
  const stageValue = typeof row.stage === 'string' ? row.stage : null;
  const stageStyles = getStageRowStyles(stageValue, colorScheme, 'parent');
  const rowBg = stageStyles.backgroundColor || colors.bg;
  const attentionAccent = attentionHighlighted
    ? `inset 3px 0 0 ${colors.warning}`
    : null;
  const rowAccentShadow = attentionAccent
    ? attentionAccent
    : isExpanded
      ? `inset 3px 0 0 ${stageStyles.accentColor}`
      : stageStyles.boxShadow;
  const expandColumnWidth = getColumnWidth(PARENT_EXPAND_COLUMN);
  const hasExpandColumn = columns.some((column) => column.field === PARENT_EXPAND_COLUMN_FIELD);

  const getPinnedCellStyle = (column: ColumnConfig): CSSProperties => {
    if (column.field === PARENT_EXPAND_COLUMN_FIELD) {
      return {
        position: 'sticky',
        left: 0,
        zIndex: zIndex.sticky,
        backgroundColor: rowBg,
        boxShadow: rowAccentShadow,
      };
    }

    if (column.field === 'name') {
      return {
        position: 'sticky',
        left: hasExpandColumn ? expandColumnWidth : 0,
        zIndex: zIndex.sticky,
        backgroundColor: rowBg,
        boxShadow: `${colors.stickyShadow}, ${rowAccentShadow}`,
      };
    }

    return {};
  };

  return (
    <>
      <tr
        data-deal-row=""
        style={{
          borderBottom: `1px solid ${colors.borderSubtle}`,
          backgroundColor: rowBg,
          transition: 'background-color 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)',
          boxShadow: rowAccentShadow,
        }}
      >
        {columns.map((column) => (
          <td
            key={column.field}
            style={{
              width: `${getColumnWidth(column)}px`,
              maxWidth: `${getColumnWidth(column)}px`,
              minWidth: `${getColumnWidth(column)}px`,
              padding: column.field === PARENT_EXPAND_COLUMN_FIELD ? '10px 4px' : '10px 14px',
              fontSize: font.sizeSm,
              whiteSpace: 'nowrap',
              overflow: parentCellOverflow(column.field),
              textOverflow: column.field === 'loadDate' ? undefined : 'ellipsis',
              color: colors.textSecondary,
              boxSizing: 'border-box',
              verticalAlign: 'middle',
              position: column.field === 'loadDate' ? 'relative' : undefined,
              zIndex: column.field === 'loadDate' ? 2 : undefined,
              ...getPinnedCellStyle(column),
            }}
          >
            {column.field === PARENT_EXPAND_COLUMN_FIELD ? (
              <ExpandToggleButton
                recordId={row.id}
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
              />
            ) : (
              <DynamicFieldCell
                objectName="opportunity"
                recordId={row.id}
                field={column.field}
                descriptor={parentDescriptorByField.get(column.field)}
                value={resolveFieldValue(row, column.field)}
                variant="parent"
                lineItems={lineItems}
                allDealLineItems={allDealLineItems}
                isExpanded={isExpanded}
                companyName={companyName}
                row={row}
                opportunityLinkFields={opportunityLinkFields}
                onToggleExpand={onToggleExpand}
                hideExpandButton={hasExpandColumn}
              />
            )}
          </td>
        ))}
      </tr>
      {isExpanded ? (
        <tr>
          <td
            colSpan={columns.length}
            style={{
              padding: 0,
              backgroundColor: colors.bgNested,
              borderBottom: `1px solid ${colors.border}`,
              boxShadow: `inset 4px 0 0 ${stageStyles.accentColor}`,
            }}
          >
            <ExpandedLineItems
              row={row}
              lineItems={lineItems}
              childColumns={childColumns}
              childGroups={childGroups}
              childDescriptorByField={childDescriptorByField}
              filters={filters}
              hasLineItemFilters={hasLineItemFilters}
              showAllPositions={showAllPositions}
              onToggleShowAllPositions={onToggleShowAllPositions}
              onChildColumnResizeStart={onChildColumnResizeStart}
              boardStream={boardStream}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
});
