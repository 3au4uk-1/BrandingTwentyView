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
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
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
  const theme = useTheme();
  const { colors, font, spacing, zIndex } = theme;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const { mode } = useExpandMode();
  const prevExpandModeRef = useRef(mode);
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
    const previousMode = prevExpandModeRef.current;
    prevExpandModeRef.current = mode;

    if (mode === 'collapsed') {
      if (previousMode !== 'collapsed') {
        setExpandedIds(new Set());
      }
      return;
    }

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
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner theme={theme} label="Загрузка сделок..." />
      </div>
    );
  }

  if (!activeView) {
    return (
      <EmptyState theme={theme} title="View не выбрана" description="Создайте или выберите представление в верхней панели." />
    );
  }

  if (errorMessage) {
    return (
      <EmptyState
        theme={theme}
        title="Не удалось загрузить данные"
        description={errorMessage}
      />
    );
  }

  if (!records.length) {
    return (
      <EmptyState
        theme={theme}
        title="Нет сделок по фильтрам"
        description="Попробуйте изменить фильтры или сбросить их."
        action={{ label: 'Сбросить фильтры', onClick: () => onResetFilters?.() }}
      />
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
        }}
      >
        <table
          style={{
            width: 'max-content',
            minWidth: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            backgroundColor: colors.bg,
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
          <thead style={{ position: 'sticky', top: 0, zIndex: zIndex.sticky + 1 }}>
            <tr
              style={{
                borderBottom: `1px solid ${colors.border}`,
                backgroundColor: colors.bgSecondary,
              }}
            >
              {parentColumns.map((column) => (
                <th
                  key={column.field}
                  style={{
                    padding: '10px 12px',
                    textAlign: 'left',
                    fontSize: font.sizeXs,
                    fontWeight: font.weightSemibold,
                    color: colors.textMuted,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    width: column.width ? `${column.width}px` : 'auto',
                    maxWidth: column.width ? `${column.width}px` : undefined,
                    whiteSpace: 'nowrap',
                    ...(column.field === 'name'
                      ? {
                          position: 'sticky' as const,
                          left: 0,
                          zIndex: zIndex.sticky + 2,
                          backgroundColor: colors.bgSecondary,
                          boxShadow: colors.stickyShadow,
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
                isHovered={hoveredRowId === row.id}
                onHoverChange={(hovered) => setHoveredRowId(hovered ? row.id : null)}
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
          padding: `${spacing.sm} ${spacing.md}`,
          fontSize: font.sizeSm,
          color: colors.textSecondary,
          backgroundColor: colors.bgSecondary,
          borderTop: `1px solid ${colors.border}`,
          flexShrink: 0,
        }}
      >
        <span>
          Страница {page + 1} из {totalPages} · Всего: {totalCount}
        </span>

        <div style={{ display: 'flex', gap: spacing.sm }}>
          <Button theme={theme} variant="secondary" size="sm" onClick={() => onPageChange(Math.max(0, page - 1))} disabled={!canPrev}>
            Назад
          </Button>
          <Button
            theme={theme}
            variant="secondary"
            size="sm"
            onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
            disabled={!canNext}
          >
            Вперёд
          </Button>
        </div>
      </div>
    </div>
  );
};
