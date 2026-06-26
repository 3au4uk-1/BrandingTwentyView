import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { DEFAULT_PARENT_COLUMNS } from 'src/constants/column-definitions';

import { fetchCompanyNames } from '../api/companies';
import { useDealBoardViews } from '../hooks/useDealBoardViews';
import { useOpportunities } from '../hooks/useOpportunities';
import { visibleColumns } from '../utils/columns';
import { DealRow } from './DealRow';

const PAGE_SIZE = 50;

type DealsTableProps = {
  colorScheme: 'light' | 'dark';
};

export const DealsTable = ({ colorScheme }: DealsTableProps) => {
  const [page, setPage] = useState(0);

  const viewsQuery = useDealBoardViews();
  const views = viewsQuery.data ?? [];
  const activeView = useMemo(
    () => views.find((view) => view.isDefault) ?? views[0],
    [views],
  );

  useEffect(() => {
    setPage(0);
  }, [activeView?.id]);

  const parentColumns = useMemo(
    () => visibleColumns(activeView?.parentColumns ?? DEFAULT_PARENT_COLUMNS),
    [activeView?.parentColumns],
  );

  const opportunitiesQuery = useOpportunities({
    viewId: activeView?.id,
    filters: activeView?.filters ?? {},
    sort: activeView?.sort ?? [],
    page,
    pageSize: PAGE_SIZE,
    enabled: !viewsQuery.isLoading,
  });

  const records = opportunitiesQuery.data?.records ?? [];
  const totalCount = opportunitiesQuery.data?.totalCount ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

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

  if (viewsQuery.isLoading || opportunitiesQuery.isLoading) {
    return (
      <div
        style={{
          height: '100%',
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

  if (!records.length) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colorScheme === 'dark' ? '#eee' : '#333',
        }}
      >
        Сделки не найдены
      </div>
    );
  }

  const canPrev = page > 0;
  const canNext = page < totalPages - 1;

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          borderBottom: `1px solid ${colorScheme === 'dark' ? '#333' : '#eee'}`,
        }}
      >
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
            backgroundColor: colorScheme === 'dark' ? '#222' : '#fff',
          }}
        >
          <thead>
            <tr style={{ borderBottom: `1px solid ${colorScheme === 'dark' ? '#333' : '#eee'}` }}>
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
        }}
      >
        <span>
          Страница {page + 1} из {totalPages} · Всего: {totalCount}
        </span>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setPage((prev) => Math.max(0, prev - 1))}
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
            onClick={() => setPage((prev) => Math.min(totalPages - 1, prev + 1))}
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
