import type { ReactNode } from 'react';
import { Tag } from 'twenty-sdk/ui';

import type { ColumnConfig, LineItemRow } from '../types';
import { LinkCell } from '../editors/LinkCell';
import { NumberCell } from '../editors/NumberCell';
import { RichTextPopover } from '../editors/RichTextPopover';
import { StageSelect } from '../editors/StageSelect';

type LineItemsTableProps = {
  items: LineItemRow[];
  columns: ColumnConfig[];
  colorScheme: 'light' | 'dark';
};

const formatAmount = (item: LineItemRow) => {
  if (!item.amount) return '—';

  const amount = item.amount.amountMicros / 1_000_000;
  return `${amount.toLocaleString('ru-RU')} ${item.amount.currencyCode}`;
};

export const LineItemsTable = ({ items, columns, colorScheme }: LineItemsTableProps) => {
  if (!items.length) {
    return (
      <div
        style={{
          padding: '10px 12px',
          fontSize: '12px',
          color: colorScheme === 'dark' ? '#bdbdbd' : '#666',
        }}
      >
        Нет позиций
      </div>
    );
  }

  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        backgroundColor: colorScheme === 'dark' ? '#1d1d1d' : '#fcfcfc',
      }}
    >
      <thead>
        <tr style={{ borderBottom: `1px solid ${colorScheme === 'dark' ? '#2f2f2f' : '#ebebeb'}` }}>
          {columns.map((column) => (
            <th
              key={column.field}
              style={{
                padding: '6px 10px',
                textAlign: 'left',
                fontSize: '11px',
                fontWeight: 600,
                color: colorScheme === 'dark' ? '#d7d7d7' : '#555',
                width: column.width ? `${column.width}px` : 'auto',
                maxWidth: column.width ? `${column.width}px` : undefined,
                whiteSpace: 'nowrap',
              }}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={item.id} style={{ borderBottom: `1px solid ${colorScheme === 'dark' ? '#2b2b2b' : '#efefef'}` }}>
            {columns.map((column) => {
              let content: ReactNode = '—';

              if (column.field === 'name') {
                content = item.name;
              } else if (column.field === 'stage') {
                content = (
                  <StageSelect
                    itemId={item.id}
                    value={item.stage}
                    colorScheme={colorScheme}
                  />
                );
              } else if (column.field === 'ssylkaNaMakety') {
                content = (
                  <LinkCell
                    itemId={item.id}
                    value={item.ssylkaNaMakety}
                    colorScheme={colorScheme}
                  />
                );
              } else if (column.field === 'plenka') {
                content = (
                  <RichTextPopover
                    itemId={item.id}
                    field="plenka.markdown"
                    value={item.plenka?.markdown}
                    colorScheme={colorScheme}
                  />
                );
              } else if (column.field === 'kolichestvo') {
                content = (
                  <NumberCell
                    itemId={item.id}
                    value={item.kolichestvo}
                    colorScheme={colorScheme}
                  />
                );
              } else if (column.field === 'amount') {
                content = <Tag text={formatAmount(item)} color="gray" />;
              } else if (column.field === 'kommentariy') {
                content = (
                  <RichTextPopover
                    itemId={item.id}
                    field="kommentariy"
                    value={item.kommentariy}
                    colorScheme={colorScheme}
                  />
                );
              }

              return (
                <td
                  key={column.field}
                  style={{
                    width: column.width ? `${column.width}px` : 'auto',
                    maxWidth: column.width ? `${column.width}px` : undefined,
                    padding: '6px 10px',
                    fontSize: '11px',
                    color: colorScheme === 'dark' ? '#dedede' : '#333',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
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
  );
};
