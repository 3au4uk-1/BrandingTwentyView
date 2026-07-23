import { useState } from 'react';

import { DynamicFieldCell } from '../cells/DynamicFieldCell';
import { Chip, type ChipColor } from '../Chip';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { ChevronRightIcon } from '../ui/Icons';
import { visibleColumns } from '../utils/columns';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { getStageLabel, getStageColor } from 'src/constants/stages';
import type { ColumnConfig, LineItemRow } from '../types';

import { MobileFieldStack } from './MobileFieldStack';
import { MOBILE_LINE_ITEM_HEADER_FIELDS, partitionColumns } from './mobile-field-layout';

type MobileLineItemRowProps = {
  item: LineItemRow;
  columns: ColumnConfig[];
  descriptorByField: Map<string, FieldDescriptor>;
  isLast: boolean;
};

export const MobileLineItemRow = ({
  item,
  columns,
  descriptorByField,
  isLast,
}: MobileLineItemRowProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const visible = visibleColumns(columns);
  const visibleFields = visible.map(({ field }) => field);
  const { header, detail } = partitionColumns(visible, MOBILE_LINE_ITEM_HEADER_FIELDS);
  const [isExpanded, setIsExpanded] = useState(false);

  const nameValue = typeof item.name === 'string' ? item.name : 'Без названия';
  const stageValue = item.stage ?? null;
  const showStageInHeader = header.some((column) => column.field === 'stage') && stageValue;

  const renderField = (column: ColumnConfig) => (
    <DynamicFieldCell
      objectName="dealLineItem"
      recordId={item.id}
      field={column.field}
      descriptor={descriptorByField.get(column.field)}
      value={resolveFieldValue(item, column.field)}
      variant="child"
      row={item}
      visibleFields={visibleFields}
      listMenuPresentation="sheet"
      touchFriendly
    />
  );

  const detailFields = [
    ...header.filter((column) => column.field !== 'name'),
    ...detail,
  ];

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
          {detailFields.map((column) => (
            <MobileFieldStack key={column.field} label={column.label} compact>
              {renderField(column)}
            </MobileFieldStack>
          ))}
        </div>
      ) : null}
    </div>
  );
};
