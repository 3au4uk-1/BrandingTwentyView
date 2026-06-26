import type { ReactNode } from 'react';

import { Chip } from '../Chip';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { ChevronRightIcon } from '../ui/Icons';

import type { ColumnConfig, LineItemRow, OpportunityRow } from '../types';
import { DealSummaryChips } from './DealSummaryChips';
import { LineItemsTable } from './LineItemsTable';

const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' });

const formatDate = (value?: string) => {
  if (!value) return EMPTY_VALUE;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;

  return shortDateFormatter.format(date);
};

const formatAmount = (row: OpportunityRow) => {
  if (!row.amount) return EMPTY_VALUE;

  const amount = row.amount.amountMicros / 1_000_000;
  return `${amount.toLocaleString('ru-RU')} ${row.amount.currencyCode}`;
};

type DealRowProps = {
  row: OpportunityRow;
  columns: ColumnConfig[];
  childColumns: ColumnConfig[];
  lineItems: LineItemRow[];
  isExpanded: boolean;
  isHovered: boolean;
  onHoverChange: (hovered: boolean) => void;
  onToggleExpand: (id: string) => void;
};

export const DealRow = ({
  row,
  columns,
  childColumns,
  lineItems,
  isExpanded,
  isHovered,
  onHoverChange,
  onToggleExpand,
}: DealRowProps) => {
  const theme = useTheme();
  const { colors, font, spacing, zIndex } = theme;
  const canExpand = lineItems.length > 0;
  const rowBg = isHovered ? colors.bgHover : colors.bg;

  return (
    <>
      <tr
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        style={{
          borderBottom: `1px solid ${colors.borderSubtle}`,
          backgroundColor: rowBg,
          transition: 'background-color 0.12s ease',
        }}
      >
        {columns.map((column) => {
          let content: ReactNode = EMPTY_VALUE;

          if (column.field === 'name') {
            content = (
              <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0 }}>
                {canExpand ? (
                  <button
                    type="button"
                    onClick={() => onToggleExpand(row.id)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      padding: 0,
                      width: '20px',
                      minWidth: '20px',
                      height: '20px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: colors.textMuted,
                      cursor: 'pointer',
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease',
                    }}
                    aria-label={isExpanded ? 'Свернуть позиции' : 'Развернуть позиции'}
                  >
                    <ChevronRightIcon size={14} color={colors.textSecondary} />
                  </button>
                ) : (
                  <span style={{ width: '20px', minWidth: '20px' }} />
                )}
                <span
                  style={{
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontWeight: font.weightMedium,
                    color: colors.text,
                  }}
                >
                  {row.name}
                </span>
              </div>
            );
          } else if (column.field === 'loadDate') {
            content = formatDate(row.loadDate);
          } else if (column.field === 'companyName') {
            content = row.companyName ?? EMPTY_VALUE;
          } else if (column.field === 'summary') {
            content = isExpanded ? EMPTY_VALUE : <DealSummaryChips items={lineItems} />;
          } else if (column.field === 'links') {
            const tonyUrl = row.tonyLink?.primaryLinkUrl;
            const bitrixUrl = row.bitrixLink?.primaryLinkUrl;

            content = (
              <div style={{ display: 'inline-flex', gap: spacing.xs }}>
                {tonyUrl ? (
                  <a
                    href={tonyUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Tony"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: theme.radius.sm,
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.bgElevated,
                      color: colors.textSecondary,
                      textDecoration: 'none',
                      fontSize: font.sizeXs,
                      fontWeight: font.weightSemibold,
                    }}
                  >
                    T
                  </a>
                ) : null}
                {bitrixUrl ? (
                  <a
                    href={bitrixUrl}
                    target="_blank"
                    rel="noreferrer"
                    title="Bitrix"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: theme.radius.sm,
                      border: `1px solid ${colors.border}`,
                      backgroundColor: colors.bgElevated,
                      color: colors.textSecondary,
                      textDecoration: 'none',
                      fontSize: font.sizeXs,
                      fontWeight: font.weightSemibold,
                    }}
                  >
                    B
                  </a>
                ) : null}
                {!tonyUrl && !bitrixUrl ? EMPTY_VALUE : null}
              </div>
            );
          } else if (column.field === 'amount') {
            content = <Chip text={formatAmount(row)} color="gray" theme={theme} />;
          } else if (column.field === 'oplata') {
            content = <Chip text={row.oplata ?? EMPTY_VALUE} color={row.oplata ? 'green' : 'gray'} theme={theme} />;
          }

          return (
            <td
              key={column.field}
              style={{
                width: column.width ? `${column.width}px` : 'auto',
                maxWidth: column.width ? `${column.width}px` : undefined,
                padding: '10px 12px',
                fontSize: font.sizeSm,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                color: colors.textSecondary,
                ...(column.field === 'name'
                  ? {
                      position: 'sticky' as const,
                      left: 0,
                      zIndex: zIndex.sticky,
                      backgroundColor: rowBg,
                      boxShadow: colors.stickyShadow,
                    }
                  : {}),
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
              backgroundColor: colors.bgInset,
              borderBottom: `1px solid ${colors.border}`,
            }}
          >
            <LineItemsTable items={lineItems} columns={childColumns} />
          </td>
        </tr>
      ) : null}
    </>
  );
};
