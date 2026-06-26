import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  DEFAULT_CHILD_COLUMNS,
  DEFAULT_PARENT_COLUMNS,
} from 'src/constants/column-definitions';
import { DONE_STAGES } from 'src/constants/stages';

import { fetchCompanyNames } from '../api/companies';
import type { ExpandMode } from '../hooks/useExpandMode';
import { useExpandMode } from '../hooks/useExpandMode';
import type { DealBoardViewRecord, LineItemRow, OpportunityRow } from '../types';
import { visibleColumns } from '../utils/columns';
import { readSessionStorage, writeSessionStorage } from '../utils/browser-storage';
import { DealRow } from './DealRow';

const EXPANDED_IDS_STORAGE_PREFIX = 'deals-board-expanded-ids';

const shouldAutoExpand = (
  items: ReadonlyArray<{ stage?: string | null }>,
  mode: ExpandMode,
) =>
  mode === 'smart' &&
  items.some((i) => i.stage && !DONE_STAGES.includes(i.stage));

type DealsTableProps = {
  colorScheme: 'light' | 'dark';
  activeView?: DealBoardViewRecord;
  records: OpportunityRow[];
  lineItems: LineItemRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  onPageChange: (nextPage: number) => void;
  onResetFilters?: () => void;
  isLoading?: boolean;
  isViewLoading?: boolean;
  errorMessage?: string;
};

export const DealsTable = ({
  colorScheme,
  activeView,
  records,
  lineItems,
  totalCount,
  page,
  totalPages,
  onPageChange,
  onResetFilters,
  isLoading = false,
  isViewLoading = false,
  errorMessage,
}: DealsTableProps) => {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { mode } = useExpandMode();
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const parentColumns = useMemo(
    () => visibleColumns(activeView?.parentColumns ?? DEFAULT_PARENT_COLUMNS),
    [activeView?.parentColumns],
  );
  const childColumns = useMemo(
    () => visibleColumns(activeView?.childColumns ?? DEFAULT_CHILD_COLUMNS),
    [activeView?.childColumns],
  );

  const companyIds = useMemo(
    () =>
      [...new Set(records.map((record) => record.companyId).filter((id): id is string => Boolean(id)))].sort(),
    [records],
  );

  const companyNamesQuery = useQuery({
    queryKey: ['companyNames', companyIds],
    queryFn: () => fetchCompanyNames(companyIds),
    enabled: companyIds.length > 0,
    staleTime: 60_000,
  });

  const companyNameMap = companyNamesQuery.data ?? new Map<string, string>();

  const lineItemsByOpportunity = useMemo(() => {
    const grouped = new Map<string, typeof lineItems>();
    for (const item of lineItems) {
      const current = grouped.get(item.opportunityId) ?? [];
      grouped.set(item.opportunityId, [...current, item]);
    }
    return grouped;
  }, [lineItems]);

  const expandedStorageKey = activeView?.id ? `${EXPANDED_IDS_STORAGE_PREFIX}:${activeView.id}` : null;

  useEffect(() => {
    if (!expandedStorageKey) {
      setExpandedIds(new Set());
      return;
    }

    const stored = readSessionStorage(expandedStorageKey);
    if (!stored) {
      setExpandedIds(new Set());
      return;
    }

    try {
      const parsed = JSON.parse(stored);
      const ids = Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === 'string') : [];
      setExpandedIds(new Set(ids));
    } catch {
      setExpandedIds(new Set());
    }
  }, [expandedStorageKey]);

  useEffect(() => {
    if (!expandedStorageKey) return;
    writeSessionStorage(expandedStorageKey, JSON.stringify([...expandedIds]));
  }, [expandedIds, expandedStorageKey]);

  useEffect(() => {
    if (mode !== 'smart') return;

    setExpandedIds((previous) => {
      const next = new Set(previous);
      let changed = false;

      for (const record of records) {
        const items = lineItemsByOpportunity.get(record.id) ?? [];
        if (shouldAutoExpand(items, mode) && !next.has(record.id)) {
          next.add(record.id);
          changed = true;
        }
      }

      return changed ? next : previous;
    });
  }, [lineItemsByOpportunity, mode, records]);

  if (isViewLoading || isLoading) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colorScheme === 'dark' ? '#eee' : '#333',
        }}
      >
        Загрузка сделок...
      </div>
    );
  }

  if (!activeView) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colorScheme === 'dark' ? '#eee' : '#333',
        }}
      >
        View не выбрана
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          padding: '16px',
          color: colorScheme === 'dark' ? '#ffb4b4' : '#b42318',
          textAlign: 'center',
        }}
      >
        <span>Не удалось загрузить данные</span>
        <span style={{ fontSize: '12px', maxWidth: '520px' }}>{errorMessage}</span>
      </div>
    );
  }

  if (!records.length) {
    return (
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          color: colorScheme === 'dark' ? '#eee' : '#333',
        }}
      >
        <span>Нет сделок по фильтрам</span>
        <button
          type="button"
          onClick={() => onResetFilters?.()}
          style={{
            border: `1px solid ${colorScheme === 'dark' ? '#444' : '#ddd'}`,
            backgroundColor: 'transparent',
            color: colorScheme === 'dark' ? '#eee' : '#333',
            borderRadius: '6px',
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: '12px',
          }}
        >
          Сбросить фильтры
        </button>
      </div>
    );
  }

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          borderBottom: `1px solid ${colorScheme === 'dark' ? '#333' : '#eee'}`,
        }}
      >
        <table
          style={{
            width: 'max-content',
            minWidth: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            backgroundColor: colorScheme === 'dark' ? '#222' : '#fff',
          }}
        >
          <colgroup>
            {parentColumns.map((column) => (
              <col
                key={column.field}
                style={{
                  width: column.width ? `${column.width}px` : 'auto',
                }}
              />
            ))}
          </colgroup>
          <thead style={{ position: 'sticky', top: 0, zIndex: 4 }}>
            <tr
              style={{
                borderBottom: `1px solid ${colorScheme === 'dark' ? '#333' : '#eee'}`,
                backgroundColor: colorScheme === 'dark' ? '#222' : '#fff',
              }}
            >
              {parentColumns.map((column) => (
                <th
                  key={column.field}
                  style={{
                    padding: '8px 10px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: colorScheme === 'dark' ? '#eee' : '#333',
                    width: column.width ? `${column.width}px` : 'auto',
                    maxWidth: column.width ? `${column.width}px` : undefined,
                    whiteSpace: 'nowrap',
                    ...(column.field === 'name'
                      ? {
                          position: 'sticky' as const,
                          left: 0,
                          zIndex: 6,
                          backgroundColor: colorScheme === 'dark' ? '#222' : '#fff',
                        }
                      : {}),
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {records.map((row) => (
              <DealRow
                key={row.id}
                row={{ ...row, companyName: row.companyName ?? companyNameMap.get(row.companyId ?? '') }}
                columns={parentColumns}
                childColumns={childColumns}
                lineItems={lineItemsByOpportunity.get(row.id) ?? []}
                isExpanded={expandedIds.has(row.id)}
                onToggleExpand={(id) =>
                  setExpandedIds((previous) => {
                    const next = new Set(previous);
                    if (next.has(id)) {
                      next.delete(id);
                    } else {
                      next.add(id);
                    }
                    return next;
                  })
                }
                colorScheme={colorScheme}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 10px',
          fontSize: '12px',
          color: colorScheme === 'dark' ? '#eee' : '#333',
          backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#fafafa',
          flexShrink: 0,
        }}
      >
        <span>
          Страница {page + 1} из {totalPages} · Всего: {totalCount}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => onPageChange(Math.max(0, page - 1))}
            disabled={!canPrev}
            style={{
              border: `1px solid ${colorScheme === 'dark' ? '#444' : '#ddd'}`,
              backgroundColor: 'transparent',
              color: colorScheme === 'dark' ? '#eee' : '#333',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: canPrev ? 'pointer' : 'not-allowed',
            }}
          >
            Назад
          </button>
          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={!canNext}
            style={{
              border: `1px solid ${colorScheme === 'dark' ? '#444' : '#ddd'}`,
              backgroundColor: 'transparent',
              color: colorScheme === 'dark' ? '#eee' : '#333',
              borderRadius: '6px',
              padding: '4px 8px',
              cursor: canNext ? 'pointer' : 'not-allowed',
            }}
          >
            Вперёд
          </button>
        </div>
      </div>
    </div>
  );
};
