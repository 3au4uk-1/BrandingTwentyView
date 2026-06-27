import { useMemo, useRef, type ReactNode } from 'react';

import { Chip } from '../Chip';
import { useContainerWidth } from '../hooks/useContainerWidth';
import type { ColumnResizeStartEvent } from '../hooks/useColumnResize';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { getColumnWidth, getTableLayoutStyle, layoutColumnsForContainer } from '../utils/columns';

import type { ColumnConfig, LineItemRow } from '../types';
import { LinkCell } from '../editors/LinkCell';
import { NumberCell } from '../editors/NumberCell';
import { RichTextPopover } from '../editors/RichTextPopover';
import { StageSelect } from '../editors/StageSelect';
import { ResizableColumnHeader } from './ResizableColumnHeader';

type LineItemsTableProps = {
  items: LineItemRow[];
  columns: ColumnConfig[];
  onColumnResizeStart: (event: ColumnResizeStartEvent, field: string, startWidth: number) => void;
  userSized?: boolean;
};

const formatAmount = (item: LineItemRow) => {
  if (!item.amount) return EMPTY_VALUE;

  const amount = item.amount.amountMicros / 1_000_000;
  return `${amount.toLocaleString('ru-RU')} ${item.amount.currencyCode}`;
};

export const LineItemsTable = ({
  items,
  columns,
  onColumnResizeStart,
  userSized = false,
}: LineItemsTableProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const containerWidth = useContainerWidth(containerRef);

  const layoutColumns = useMemo(() => {
    if (userSized) return columns;
    return layoutColumnsForContainer(columns, containerWidth, 'name');
  }, [columns, containerWidth, userSized]);

  const tableStyle = getTableLayoutStyle(layoutColumns, containerWidth);

  if (!items.length) {
    return (
      <div
        style={{
          padding: `${spacing.sm} ${spacing.md}`,
          fontSize: font.sizeSm,
          color: colors.textMuted,
        }}
      >
        Нет позиций
      </div>
    );
  }

  return (
    <div style={{ padding: `${spacing.xs} ${spacing.md} ${spacing.sm} 36px` }}>
      <div ref={containerRef}>
        <table
          style={{
            ...tableStyle,
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            backgroundColor: colors.bgElevated,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: theme.radius.md,
          }}
        >
          <colgroup>
            {layoutColumns.map((column) => (
              <col key={column.field} style={{ width: `${getColumnWidth(column)}px` }} />
            ))}
          </colgroup>
          <thead>
            <tr style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
              {layoutColumns.map((column) => (
                <ResizableColumnHeader
                  key={column.field}
                  column={column}
                  onResizeStart={onColumnResizeStart}
                  compact
                >
                  {column.label}
                </ResizableColumnHeader>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, rowIndex) => (
              <tr
                key={item.id}
                style={{
                  borderBottom:
                    rowIndex < items.length - 1 ? `1px solid ${colors.borderSubtle}` : 'none',
                  backgroundColor: colors.bgElevated,
                }}
              >
                {layoutColumns.map((column) => {
                  let content: ReactNode = EMPTY_VALUE;

                  if (column.field === 'name') {
                    content = (
                      <span style={{ fontWeight: font.weightMedium, color: colors.text }}>{item.name}</span>
                    );
                  } else if (column.field === 'stage') {
                    content = <StageSelect itemId={item.id} value={item.stage} />;
                  } else if (column.field === 'ssylkaNaMakety') {
                    content = <LinkCell itemId={item.id} value={item.ssylkaNaMakety} />;
                  } else if (column.field === 'plenka') {
                    content = (
                      <RichTextPopover
                        itemId={item.id}
                        field="plenka.markdown"
                        value={item.plenka?.markdown}
                      />
                    );
                  } else if (column.field === 'kolichestvo') {
                    content = <NumberCell itemId={item.id} value={item.kolichestvo} />;
                  } else if (column.field === 'amount') {
                    content = <Chip text={formatAmount(item)} color="gray" theme={theme} />;
                  } else if (column.field === 'kommentariy') {
                    content = (
                      <RichTextPopover itemId={item.id} field="kommentariy" value={item.kommentariy} />
                    );
                  }

                  const width = getColumnWidth(column);

                  return (
                    <td
                      key={column.field}
                      style={{
                        width: `${width}px`,
                        maxWidth: `${width}px`,
                        minWidth: `${width}px`,
                        padding: '8px 10px',
                        fontSize: font.sizeSm,
                        color: colors.textSecondary,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        verticalAlign: 'middle',
                        boxSizing: 'border-box',
                      }}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
