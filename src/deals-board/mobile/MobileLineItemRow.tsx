import { useState } from 'react';

import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import { GroupChipsCell } from '../cells/GroupChipsCell';
import { GroupFieldStrip } from '../cells/GroupFieldStrip';
import { Chip, type ChipColor } from '../Chip';
import { useLineItemGroupExpand } from '../hooks/useLineItemGroupExpand';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { ChevronRightIcon } from '../ui/Icons';
import { visibleColumns } from '../utils/columns';
import {
  buildChildLayoutColumns,
  partitionUngroupedAndGroups,
} from '../utils/column-groups';
import { findActiveGroupMembers } from '../utils/active-group';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageLabel, getStageColor } from 'src/constants/stages';
import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';
import type { BoardStream } from 'src/constants/product-stream';

import { MobileFieldStack } from './MobileFieldStack';
import {
  clearHeaderFieldGroupIds,
  MOBILE_LINE_ITEM_HEADER_FIELDS,
  partitionColumns,
} from './mobile-field-layout';

type MobileLineItemRowProps = {
  item: LineItemRow;
  columns: ColumnConfig[];
  groups: ColumnGroupConfig[];
  descriptorByField: Map<string, FieldDescriptor>;
  isLast: boolean;
  boardStream?: BoardStream;
};

export const MobileLineItemRow = ({
  item,
  columns,
  groups,
  descriptorByField,
  isLast,
  boardStream,
}: MobileLineItemRowProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const visible = visibleColumns(columns);
  const { header, detail } = partitionColumns(visible, MOBILE_LINE_ITEM_HEADER_FIELDS);
  const [isExpanded, setIsExpanded] = useState(false);

  const nameValue = typeof item.name === 'string' ? item.name : 'Без названия';
  const stageValue = item.stage ?? null;
  const showStageInHeader = header.some((column) => column.field === 'stage') && stageValue;
  const detailFields = [
    ...header.filter((column) => column.field !== 'name'),
    ...detail,
  ];
  const detailLayout = buildChildLayoutColumns(
    clearHeaderFieldGroupIds(detailFields, MOBILE_LINE_ITEM_HEADER_FIELDS),
    groups,
  );
  const { ungrouped, groupEntries } = partitionUngroupedAndGroups(detailLayout);
  const flatVisibleFields = ungrouped.map((entry) => entry.field);
  const groupExpansion = useLineItemGroupExpand();

  const renderField = (column: ColumnConfig) => (
    <DynamicFieldCell
      objectName="dealLineItem"
      recordId={item.id}
      field={column.field}
      descriptor={descriptorByField.get(column.field)}
      value={resolveFieldValue(item, column.field)}
      variant="child"
      row={item}
      visibleFields={flatVisibleFields}
      listMenuPresentation="sheet"
      touchFriendly
      boardStream={boardStream}
    />
  );

  return (
    <div
      style={{
        borderBottom: isLast ? 'none' : `1px solid ${colors.borderSubtle}`,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing.sm,
          minHeight: 48,
          padding: `${spacing.sm} 0`,
        }}
      >
        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Свернуть позицию' : 'Развернуть позицию'}
          style={{
            border: 'none',
            background: 'transparent',
            minWidth: 32,
            minHeight: 32,
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
          <ChevronRightIcon size={14} color="currentColor" />
        </button>

        <button
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            background: 'transparent',
            padding: 0,
            margin: 0,
            textAlign: 'left',
            cursor: 'pointer',
            touchAction: 'manipulation',
          }}
        >
          <div
            style={{
              fontSize: font.sizeSm,
              fontWeight: font.weightMedium,
              color: colors.text,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {nameValue}
          </div>
        </button>

        {showStageInHeader && !isExpanded ? (
          <Chip
            text={getStageLabel(stageValue)}
            color={getStageColor(stageValue) as ChipColor}
            theme={theme}
          />
        ) : null}
      </div>

      {isExpanded ? (
        <div
          style={{
            padding: `0 0 ${spacing.md} ${spacing.lg}`,
          }}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {header.some((column) => column.field === 'name') ? (
            <MobileFieldStack label="Позиция" compact>
              {renderField(header.find((column) => column.field === 'name')!)}
            </MobileFieldStack>
          ) : null}
          {ungrouped.map((entry) => (
            <MobileFieldStack key={entry.field} label={entry.label} compact>
              {renderField(entry)}
            </MobileFieldStack>
          ))}
          {groupEntries.length > 0 ? (
            <div
              style={{
                display: 'grid',
                gap: spacing.sm,
                minWidth: 0,
                padding: `${spacing.xs} 0`,
              }}
            >
              <div style={{ minWidth: 0, overflowX: 'auto' }}>
                <div style={{ width: 'max-content', minWidth: '100%' }}>
                  <GroupChipsCell
                    groups={groupEntries}
                    item={item}
                    isExpanded={groupExpansion.isExpanded}
                    onToggle={groupExpansion.toggle}
                  />
                </div>
              </div>
              <GroupFieldStrip
                members={
                  findActiveGroupMembers(
                    groupEntries,
                    item.id,
                    groupExpansion.isExpanded,
                  ) ?? []
                }
                item={item}
                descriptorByField={descriptorByField}
                listMenuPresentation="sheet"
                touchFriendly
                boardStream={boardStream}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
