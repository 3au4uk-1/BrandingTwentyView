import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import {
  buildDataUrl,
  buildDownloadSrcDoc,
  revokePendingDownload,
  type PendingDownloadLink,
} from '../utils/download-blob';
import {
  fetchOkleykaSalaryLineItems,
  fetchOpportunitiesByIdsForSalary,
} from './api';
import {
  buildOkleykaSalaryRows,
  formatMarginPct,
  formatSalaryRub,
} from './compute';
import { fetchOkleykaSalaryExcelBlob } from './export-excel';

const OkleykaSalaryPageInner = () => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const [refreshKey, setRefreshKey] = useState(0);
  const [exportPending, setExportPending] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [pendingDownload, setPendingDownload] = useState<PendingDownloadLink | null>(null);
  const [downloadSrcDoc, setDownloadSrcDoc] = useState<string | null>(null);

  const query = useQuery({
    queryKey: ['okleyka-salary', refreshKey],
    queryFn: async () => {
      const lineItems = await fetchOkleykaSalaryLineItems();
      const opportunityIds = [...new Set(lineItems.map((item) => item.opportunityId))];
      const deals = await fetchOpportunitiesByIdsForSalary(opportunityIds);
      const dealsById = new Map(deals.map((deal) => [deal.id, deal]));
      return buildOkleykaSalaryRows(lineItems, dealsById);
    },
  });

  const rows = query.data ?? [];
  const totals = useMemo(() => {
    const sale = rows.reduce((sum, row) => sum + row.saleRub, 0);
    const cost = rows.reduce((sum, row) => sum + row.printCostRub + row.frezaCostRub, 0);
    const profit = sale - cost;
    return {
      sale,
      cost,
      profit,
      marginPct: sale > 0 ? (profit / sale) * 100 : null,
    };
  }, [rows]);

  useEffect(() => {
    if (!downloadSrcDoc) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string } | null;
      if (data?.type === 'okleyka-download-done') {
        setDownloadSrcDoc(null);
      }
    };
    window.addEventListener('message', onMessage);
    const timer = globalThis.setTimeout?.(() => setDownloadSrcDoc(null), 8_000);
    return () => {
      window.removeEventListener('message', onMessage);
      if (timer != null) globalThis.clearTimeout?.(timer);
    };
  }, [downloadSrcDoc]);

  const handleExportExcel = async () => {
    setExportError(null);
    setExportPending(true);
    revokePendingDownload(pendingDownload);
    setPendingDownload(null);
    setDownloadSrcDoc(null);
    try {
      const { blob, filename } = await fetchOkleykaSalaryExcelBlob(rows);
      const dataUrl = await buildDataUrl(blob);
      // Main-thread iframe: real <a download> (Remote DOM host click is broken).
      setDownloadSrcDoc(buildDownloadSrcDoc(dataUrl, filename));
      // Fallback link (open in new tab) if iframe sandbox blocks auto-download.
      setPendingDownload({ url: dataUrl, filename });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Ошибка экспорта');
    } finally {
      setExportPending(false);
    }
  };

  return (
    <div
      data-okleyka-salary-page
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: colors.bg,
        color: colors.text,
        fontFamily: font.family,
        padding: spacing.lg,
        gap: spacing.md,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      {downloadSrcDoc ? (
        <iframe
          title="okleyka-excel-download"
          srcDoc={downloadSrcDoc}
          sandbox="allow-scripts allow-downloads"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            opacity: 0,
            pointerEvents: 'none',
            border: 0,
          }}
        />
      ) : null}
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: font.sizeLg,
              fontWeight: font.weightSemibold,
              letterSpacing: '-0.02em',
            }}
          >
            Оклейщики
          </h1>
          <p style={{ margin: '4px 0 0', color: colors.textMuted, fontSize: font.sizeSm }}>
            Плёнка · Наши · стадии Оклейка / Готово
            {query.isFetching ? ' · обновление…' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: spacing.xs, alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            theme={theme}
            size="sm"
            variant="ghost"
            onClick={() => setRefreshKey((value) => value + 1)}
          >
            Обновить
          </Button>
          <Button
            theme={theme}
            size="sm"
            variant="primary"
            disabled={rows.length === 0 || exportPending}
            onClick={() => void handleExportExcel()}
          >
            {exportPending ? 'Excel…' : 'Excel'}
          </Button>
          {pendingDownload ? (
            <a
              href={pendingDownload.url}
              download={pendingDownload.filename}
              target="_blank"
              rel="noreferrer"
              style={{
                color: colors.accent,
                fontSize: font.sizeSm,
                fontWeight: font.weightMedium,
                textDecoration: 'underline',
              }}
            >
              Скачать {pendingDownload.filename}
            </a>
          ) : null}
        </div>
      </header>

      {exportError ? (
        <div style={{ color: colors.danger, fontSize: font.sizeSm }}>{exportError}</div>
      ) : null}

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: colors.bgSecondary,
          boxShadow: `inset 0 0 0 1px ${colors.borderSubtle}`,
          fontSize: font.sizeSm,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        <span>
          Позиций{' '}
          <strong style={{ color: colors.text }}>{rows.length}</strong>
        </span>
        <span>
          Продажа <strong style={{ color: colors.text }}>{formatSalaryRub(totals.sale)}</strong>
        </span>
        <span>
          Расход <strong style={{ color: colors.text }}>{formatSalaryRub(totals.cost)}</strong>
        </span>
        <span>
          Прибыль{' '}
          <strong style={{ color: colors.text }}>{formatSalaryRub(totals.profit)}</strong>
        </span>
        <span>
          Маржа{' '}
          <strong style={{ color: colors.text }}>{formatMarginPct(totals.marginPct)}</strong>
        </span>
      </div>

      {query.isError ? (
        <div style={{ color: colors.danger, fontSize: font.sizeSm }}>
          Не удалось загрузить:{' '}
          {query.error instanceof Error ? query.error.message : 'ошибка'}
        </div>
      ) : null}

      <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: font.sizeSm,
            backgroundColor: colors.bgSecondary,
            borderRadius: radius.lg,
            overflow: 'hidden',
            boxShadow: `inset 0 0 0 1px ${colors.borderSubtle}`,
          }}
        >
          <thead>
            <tr style={{ backgroundColor: colors.bgTertiary }}>
              {[
                'Bitrix',
                'Сделка',
                'Позиция',
                'Кол-во',
                'Продажа',
                'Печать',
                'Фреза',
                'Прибыль',
                'Маржа',
              ].map((label) => (
                <th
                  key={label}
                  style={{
                    textAlign: 'left',
                    padding: '10px 12px',
                    color: colors.textSecondary,
                    fontWeight: font.weightMedium,
                    fontSize: font.sizeXs,
                    borderBottom: `1px solid ${colors.borderSubtle}`,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !query.isLoading ? (
              <tr>
                <td
                  colSpan={9}
                  style={{ padding: spacing.lg, color: colors.textMuted }}
                >
                  Нет подходящих позиций
                </td>
              </tr>
            ) : null}
            {rows.map((row) => (
              <tr key={row.lineItemId} style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}>
                <td style={{ padding: '10px 12px' }}>
                  {row.bitrixUrl ? (
                    <a
                      href={row.bitrixUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: colors.accent }}
                    >
                      открыть
                    </a>
                  ) : (
                    <span style={{ color: colors.textMuted }}>—</span>
                  )}
                </td>
                <td style={{ padding: '10px 12px', maxWidth: 220 }} title={row.dealName}>
                  <span
                    style={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.dealName}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', maxWidth: 200 }} title={row.positionName}>
                  <span
                    style={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.positionName}
                  </span>
                </td>
                <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
                  {row.qty}
                </td>
                <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
                  {formatSalaryRub(row.saleRub)}
                </td>
                <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
                  {row.printCostRub > 0 ? formatSalaryRub(row.printCostRub) : '—'}
                </td>
                <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
                  {row.frezaCostRub > 0 ? formatSalaryRub(row.frezaCostRub) : '—'}
                </td>
                <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
                  {formatSalaryRub(row.profitRub)}
                </td>
                <td style={{ padding: '10px 12px', fontVariantNumeric: 'tabular-nums' }}>
                  {formatMarginPct(row.marginPct)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export const OkleykaSalaryPage = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <OkleykaSalaryPageInner />
    </ThemeProvider>
  </QueryClientProvider>
);
