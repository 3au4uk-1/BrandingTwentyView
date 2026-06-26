import type { ReactNode } from 'react';
import { Tag } from 'twenty-sdk/ui';

import { getStageColor, getStageLabel } from 'src/constants/stages';

import type { ColumnConfig, LineItemRow } from '../types';

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

const linkStyle = (colorScheme: 'light' | 'dark') => ({
  color: colorScheme === 'dark' ? '#7db4ff' : '#1868d8',
  textDecoration: 'none',
  borderBottom: `1px solid ${colorScheme === 'dark' ? '#4f6b93' : '#9ebff2'}`,
});

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
                const stage = item.stage ?? 'NOVYY';
                content = <Tag text={getStageLabel(stage)} color={getStageColor(stage)} />;
              } else if (column.field === 'ssylkaNaMakety') {
                const url = item.ssylkaNaMakety?.primaryLinkUrl;
                content = url ? (
                  <a href={url} target="_blank" rel="noreferrer" style={linkStyle(colorScheme)}>
                    {item.ssylkaNaMakety?.primaryLinkLabel ?? 'Открыть'}
                  </a>
                ) : (
                  '—'
                );
              } else if (column.field === 'plenka') {
                content = item.plenka?.markdown?.trim() || '—';
              } else if (column.field === 'kolichestvo') {
                content = typeof item.kolichestvo === 'number' ? item.kolichestvo : '—';
              } else if (column.field === 'amount') {
                content = <Tag text={formatAmount(item)} color="gray" />;
              } else if (column.field === 'kommentariy') {
                content = item.kommentariy?.trim() || '—';
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
