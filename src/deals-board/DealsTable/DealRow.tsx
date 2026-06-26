import type { ReactNode } from 'react';
import { Status, Tag } from 'twenty-sdk/ui';

import type { ColumnConfig, OpportunityRow } from '../types';

const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' });

const formatDate = (value?: string) => {
  if (!value) return '—';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return shortDateFormatter.format(date);
};

const formatAmount = (row: OpportunityRow) => {
  if (!row.amount) return '—';

  const amount = row.amount.amountMicros / 1_000_000;
  return `${amount.toLocaleString('ru-RU')} ${row.amount.currencyCode}`;
};

type DealRowProps = {
  row: OpportunityRow;
  columns: ColumnConfig[];
  colorScheme: 'light' | 'dark';
};

const linkStyle = (colorScheme: 'light' | 'dark') => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '22px',
  height: '22px',
  borderRadius: '6px',
  border: `1px solid ${colorScheme === 'dark' ? '#444' : '#ddd'}`,
  color: colorScheme === 'dark' ? '#eee' : '#333',
  textDecoration: 'none',
  fontSize: '10px',
  fontWeight: 700,
});

export const DealRow = ({ row, columns, colorScheme }: DealRowProps) => {
  return (
    <tr style={{ borderBottom: `1px solid ${colorScheme === 'dark' ? '#333' : '#eee'}` }}>
      {columns.map((column) => {
        let content: ReactNode = '—';

        if (column.field === 'name') {
          content = row.name;
        } else if (column.field === 'loadDate') {
          content = formatDate(row.loadDate);
        } else if (column.field === 'companyName') {
          content = row.companyName ?? '—';
        } else if (column.field === 'summary') {
          content = '—';
        } else if (column.field === 'links') {
          const tonyUrl = row.tonyLink?.primaryLinkUrl;
          const bitrixUrl = row.bitrixLink?.primaryLinkUrl;

          content = (
            <div style={{ display: 'inline-flex', gap: '6px' }}>
              {tonyUrl ? (
                <a href={tonyUrl} target="_blank" rel="noreferrer" style={linkStyle(colorScheme)}>
                  T
                </a>
              ) : null}
              {bitrixUrl ? (
                <a href={bitrixUrl} target="_blank" rel="noreferrer" style={linkStyle(colorScheme)}>
                  B
                </a>
              ) : null}
              {!tonyUrl && !bitrixUrl ? '—' : null}
            </div>
          );
        } else if (column.field === 'amount') {
          content = <Tag text={formatAmount(row)} color="gray" />;
        } else if (column.field === 'oplata') {
          content = <Status text={row.oplata ?? '—'} color={row.oplata ? 'green' : 'gray'} />;
        }

        return (
          <td
            key={column.field}
            style={{
              width: column.width ? `${column.width}px` : 'auto',
              maxWidth: column.width ? `${column.width}px` : undefined,
              padding: '8px 10px',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              color: colorScheme === 'dark' ? '#eee' : '#333',
            }}
          >
            {content}
          </td>
        );
      })}
    </tr>
  );
};
