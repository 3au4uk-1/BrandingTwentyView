import type { ReactNode } from 'react';

import { Chip } from '../Chip';

import type { ColumnConfig, LineItemRow, OpportunityRow } from '../types';
import { DealSummaryChips } from './DealSummaryChips';
import { LineItemsTable } from './LineItemsTable';

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
  childColumns: ColumnConfig[];
  lineItems: LineItemRow[];
  isExpanded: boolean;
  onToggleExpand: (id: string) => void;
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

const expandButtonStyle = (colorScheme: 'light' | 'dark') => ({
  border: 'none',
  background: 'transparent',
  padding: 0,
  width: '14px',
  minWidth: '14px',
  height: '14px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: colorScheme === 'dark' ? '#e8e8e8' : '#333',
  cursor: 'pointer',
  fontSize: '10px',
  lineHeight: 1,
});

const nameCellStyle = (colorScheme: 'light' | 'dark') => ({
  position: 'sticky' as const,
  left: 0,
  zIndex: 2,
  backgroundColor: colorScheme === 'dark' ? '#222' : '#fff',
});

export const DealRow = ({
  row,
  columns,
  childColumns,
  lineItems,
  isExpanded,
  onToggleExpand,
  colorScheme,
}: DealRowProps) => {
  const canExpand = lineItems.length > 0;

  return (
    <>
      <tr style={{ borderBottom: `1px solid ${colorScheme === 'dark' ? '#333' : '#eee'}` }}>
        {columns.map((column) => {
          let content: ReactNode = '—';

          if (column.field === 'name') {
            content = (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                {canExpand ? (
                  <button
                    type="button"
                    onClick={() => onToggleExpand(row.id)}
                    style={expandButtonStyle(colorScheme)}
                    aria-label={isExpanded ? 'Свернуть позиции' : 'Развернуть позиции'}
                  >
                    {isExpanded ? '▼' : '▶'}
                  </button>
                ) : null}
                <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.name}</span>
              </div>
            );
          } else if (column.field === 'loadDate') {
            content = formatDate(row.loadDate);
          } else if (column.field === 'companyName') {
            content = row.companyName ?? '—';
          } else if (column.field === 'summary') {
            content = isExpanded ? '—' : <DealSummaryChips items={lineItems} />;
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
            content = <Chip text={formatAmount(row)} color="gray" />;
          } else if (column.field === 'oplata') {
            content = <Chip text={row.oplata ?? '—'} color={row.oplata ? 'green' : 'gray'} />;
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
                ...(column.field === 'name' ? nameCellStyle(colorScheme) : {}),
              }}
            >
              {content}
            </td>
          );
        })}
      </tr>
      {canExpand && isExpanded ? (
        <tr>
          <td
            colSpan={columns.length}
            style={{
              padding: 0,
              backgroundColor: colorScheme === 'dark' ? '#191919' : '#f8f8f8',
              borderBottom: `1px solid ${colorScheme === 'dark' ? '#333' : '#eee'}`,
            }}
          >
            <LineItemsTable items={lineItems} columns={childColumns} colorScheme={colorScheme} />
          </td>
        </tr>
      ) : null}
    </>
  );
};
