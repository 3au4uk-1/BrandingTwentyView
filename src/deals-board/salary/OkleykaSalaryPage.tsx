import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';

import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import type { ThemeTokens } from '../theme/tokens';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import {
  buildDataUrl,
  buildDownloadSrcDoc,
  revokePendingDownload,
  type PendingDownloadLink,
} from '../utils/download-blob';
import { fetchOkleykaSalaryPageData } from './api';
import {
  buildOkleykaSalaryGroups,
  formatMarginPct,
  formatSalaryRub,
  marginPctTone,
  sortOkleykaSalaryGroups,
  sumOkleykaSalaryTotals,
  type OkleykaSalaryRow,
  type OkleykaSortKey,
} from './compute';
import {
  getCurrentMonthMode,
  resolveOkleykaDateRange,
  type OkleykaDateMode,
} from './date-range';
import { fetchOkleykaSalaryExcelBlob } from './export-excel';
import { OkleykaCostCell } from './OkleykaCostCell';

const SORTABLE_BEFORE_COST: { key: OkleykaSortKey; label: string }[] = [
  { key: 'saleRub', label: 'Продажа' },
  { key: 'printCostRub', label: 'Печать' },
  { key: 'frezaCostRub', label: 'Фреза' },
  { key: 'okleykaCostRub', label: 'Оклейка' },
];

const SORTABLE_AFTER_COST: { key: OkleykaSortKey; label: string }[] = [
  { key: 'profitRub', label: 'Прибыль' },
  { key: 'marginPct', label: 'Маржа' },
];

const cellPad = '10px 12px';

const moneyCellStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const marginColor = (colors: ThemeTokens['colors'], marginPct: number | null): string => {
  const tone = marginPctTone(marginPct);
  if (tone === 'danger') return colors.danger;
  if (tone === 'warning') return colors.warning;
  if (tone === 'ok') return colors.text;
  return colors.textMuted;
};

const formatOptionalCost = (value: number): string =>
  value > 0 ? formatSalaryRub(value) : '—';

const applyOkleykaOverride = (row: OkleykaSalaryRow, okleykaCostRub: number): OkleykaSalaryRow => {
  const costRub = row.printCostRub + row.frezaCostRub + okleykaCostRub;
  const profitRub = row.saleRub - costRub;
  return {
    ...row,
    okleykaCostRub,
    costRub,
    profitRub,
    marginPct: row.saleRub > 0 ? (profitRub / row.saleRub) * 100 : null,
  };
};

const OkleykaSalaryPageInner = () => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const [refreshKey, setRefreshKey] = useState(0);
  const [dateMode, setDateMode] = useState<OkleykaDateMode>(() => getCurrentMonthMode());
  const [exportPending, setExportPending] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [pendingDownload, setPendingDownload] = useState<PendingDownloadLink | null>(null);
  const [downloadSrcDoc, setDownloadSrcDoc] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [sort, setSort] = useState<{ key: OkleykaSortKey; direction: 'asc' | 'desc' } | null>(
    null,
  );
  const [copyToast, setCopyToast] = useState<{ id: string; ok: boolean } | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number>>({});
  const [focusId, setFocusId] = useState<string | null>(null);

  const resolved = resolveOkleykaDateRange(dateMode);
  const dateFrom = 'dateFrom' in resolved ? resolved.dateFrom : null;
  const dateTo = 'dateTo' in resolved ? resolved.dateTo : null;
  const dateError = 'error' in resolved ? resolved.error : null;

  const query = useQuery({
    queryKey: ['okleyka-salary', refreshKey, dateFrom, dateTo],
    enabled: Boolean(dateFrom && dateTo),
    queryFn: () => fetchOkleykaSalaryPageData(dateFrom!, dateTo!),
  });

  const rows = query.data ?? [];

  const displayRows = useMemo(
    () =>
      rows.map((row) => {
        if (overrides[row.lineItemId] === undefined) return row;
        return applyOkleykaOverride(row, overrides[row.lineItemId]!);
      }),
    [rows, overrides],
  );

  const totals = useMemo(() => sumOkleykaSalaryTotals(displayRows), [displayRows]);

  const groups = useMemo(() => {
    const base = buildOkleykaSalaryGroups(displayRows);
    return sort ? sortOkleykaSalaryGroups(base, sort.key, sort.direction) : base;
  }, [displayRows, sort]);

  const flatIds = useMemo(
    () =>
      groups.flatMap((group) =>
        collapsed.has(group.opportunityId) ? [] : group.rows.map((row) => row.lineItemId),
      ),
    [groups, collapsed],
  );

  const onMove = useCallback((id: string, direction: 1 | -1) => {
    const idx = flatIds.indexOf(id);
    if (idx < 0) return;
    const next = flatIds[idx + direction];
    if (next) setFocusId(next);
  }, [flatIds]);

  const handleOptimistic = useCallback((lineItemId: string, nextRub: number) => {
    setOverrides((prev) => ({ ...prev, [lineItemId]: nextRub }));
  }, []);

  const handleRollback = useCallback((lineItemId: string, prevRub: number) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (prevRub === rows.find((row) => row.lineItemId === lineItemId)?.okleykaCostRub) {
        delete next[lineItemId];
      } else {
        next[lineItemId] = prevRub;
      }
      return next;
    });
  }, [rows]);

  const handleFocusConsumed = useCallback(() => {
    setFocusId(null);
  }, []);

  useEffect(() => {
    setOverrides((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      let changed = false;
      const next = { ...prev };
      for (const [id, overrideValue] of Object.entries(prev)) {
        const row = rows.find((r) => r.lineItemId === id);
        if (row && row.okleykaCostRub === overrideValue) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [rows]);

  const monthInputValue =
    dateMode.kind === 'month'
      ? `${dateMode.year}-${String(dateMode.monthIndex + 1).padStart(2, '0')}`
      : '';
  const rangeFromValue = dateMode.kind === 'range' ? dateMode.dateFrom : (dateFrom ?? '');
  const rangeToValue = dateMode.kind === 'range' ? dateMode.dateTo : (dateTo ?? '');

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

  useEffect(() => {
    if (!copyToast) return;
    const timer = globalThis.setTimeout?.(() => setCopyToast(null), 2_000);
    return () => {
      if (timer != null) globalThis.clearTimeout?.(timer);
    };
  }, [copyToast]);

  const handleSortClick = (key: OkleykaSortKey) => {
    setSort((prev) => {
      if (prev?.key !== key) return { key, direction: 'desc' };
      if (prev.direction === 'desc') return { key, direction: 'asc' };
      return null;
    });
  };

  const toggleCollapsed = (opportunityId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(opportunityId)) next.delete(opportunityId);
      else next.add(opportunityId);
      return next;
    });
  };

  const copyDealName = async (opportunityId: string, dealName: string) => {
    try {
      await navigator.clipboard.writeText(dealName);
      setCopyToast({ id: opportunityId, ok: true });
    } catch {
      setCopyToast({ id: opportunityId, ok: false });
    }
  };

  const handleExportExcel = async () => {
    setExportError(null);
    setExportPending(true);
    revokePendingDownload(pendingDownload);
    setPendingDownload(null);
    setDownloadSrcDoc(null);
    try {
      const { blob, filename } = await fetchOkleykaSalaryExcelBlob(displayRows);
      const dataUrl = await buildDataUrl(blob);
      setDownloadSrcDoc(buildDownloadSrcDoc(dataUrl, filename));
      setPendingDownload({ url: dataUrl, filename });
    } catch (error) {
      setExportError(error instanceof Error ? error.message : 'Ошибка экспорта');
    } finally {
      setExportPending(false);
    }
  };

  const sortIndicator = (key: OkleykaSortKey): string => {
    if (sort?.key !== key) return '';
    return sort.direction === 'asc' ? ' ↑' : ' ↓';
  };

  const thStyle: CSSProperties = {
    textAlign: 'left',
    padding: cellPad,
    color: colors.textSecondary,
    fontWeight: font.weightMedium,
    fontSize: font.sizeXs,
    borderBottom: `1px solid ${colors.borderSubtle}`,
    whiteSpace: 'nowrap',
    position: 'sticky',
    top: 0,
    zIndex: 1,
    backgroundColor: colors.bgTertiary,
  };

  const sortableThStyle: CSSProperties = {
    ...thStyle,
    cursor: 'pointer',
    userSelect: 'none',
  };

  const renderSortableHeader = (key: OkleykaSortKey, label: string) => (
    <th
      key={key}
      style={sortableThStyle}
      onClick={() => handleSortClick(key)}
      aria-sort={
        sort?.key === key
          ? sort.direction === 'asc'
            ? 'ascending'
            : 'descending'
          : undefined
      }
    >
      {label}
      {sortIndicator(key)}
    </th>
  );

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
          position: 'sticky',
          top: 0,
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.sm,
          paddingBottom: spacing.sm,
          backgroundColor: colors.bg,
        }}
      >
        <div
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
              disabled={displayRows.length === 0 || exportPending}
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
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <Input
            theme={theme}
            type="month"
            value={monthInputValue}
            onChange={(event) => {
              const [yearStr, monthStr] = event.target.value.split('-');
              if (!yearStr || !monthStr) return;
              setDateMode({
                kind: 'month',
                year: Number(yearStr),
                monthIndex: Number(monthStr) - 1,
              });
            }}
            style={{ width: 'auto', padding: '5px 8px', fontSize: font.sizeSm }}
          />
          <Input
            theme={theme}
            type="date"
            value={rangeFromValue}
            onChange={(event) => {
              const nextFrom = event.target.value;
              const nextTo = dateMode.kind === 'range' ? dateMode.dateTo : (dateTo ?? '');
              setDateMode({ kind: 'range', dateFrom: nextFrom, dateTo: nextTo });
            }}
            style={{ width: 'auto', padding: '5px 8px', fontSize: font.sizeSm }}
          />
          <span style={{ color: colors.textMuted, fontSize: font.sizeXs }}>—</span>
          <Input
            theme={theme}
            type="date"
            value={rangeToValue}
            onChange={(event) => {
              const nextTo = event.target.value;
              const nextFrom = dateMode.kind === 'range' ? dateMode.dateFrom : (dateFrom ?? '');
              setDateMode({ kind: 'range', dateFrom: nextFrom, dateTo: nextTo });
            }}
            style={{ width: 'auto', padding: '5px 8px', fontSize: font.sizeSm }}
          />
          {dateError ? (
            <span style={{ color: colors.danger, fontSize: font.sizeSm }}>{dateError}</span>
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
          Позиций <strong style={{ color: colors.text }}>{totals.count}</strong>
        </span>
        <span>
          Продажа <strong style={{ color: colors.text }}>{formatSalaryRub(totals.sale)}</strong>
        </span>
        <span>
          Печать <strong style={{ color: colors.text }}>{formatSalaryRub(totals.print)}</strong>
        </span>
        <span>
          Фреза <strong style={{ color: colors.text }}>{formatSalaryRub(totals.freza)}</strong>
        </span>
        <span>
          Оклейка <strong style={{ color: colors.text }}>{formatSalaryRub(totals.okleyka)}</strong>
        </span>
        <span>
          Итого расход{' '}
          <strong style={{ color: colors.text }}>{formatSalaryRub(totals.cost)}</strong>
        </span>
        <span>
          Прибыль{' '}
          <strong style={{ color: colors.text }}>{formatSalaryRub(totals.profit)}</strong>
        </span>
        <span>
          Маржа{' '}
          <strong style={{ color: marginColor(colors, totals.marginPct) }}>
            {formatMarginPct(totals.marginPct)}
          </strong>
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
            <tr>
              <th style={{ ...thStyle, width: 36 }} aria-label="Развернуть" />
              <th style={thStyle}>Сделка / Позиция</th>
              <th style={thStyle}>Кол-во</th>
              {SORTABLE_BEFORE_COST.map(({ key, label }) => renderSortableHeader(key, label))}
              <th style={thStyle}>Расход</th>
              {SORTABLE_AFTER_COST.map(({ key, label }) => renderSortableHeader(key, label))}
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && !query.isLoading ? (
              <tr>
                <td colSpan={10} style={{ padding: spacing.lg, color: colors.textMuted }}>
                  Нет подходящих позиций
                </td>
              </tr>
            ) : null}
            {groups.map((group) => {
              const isCollapsed = collapsed.has(group.opportunityId);
              const groupMarginColor = marginColor(colors, group.totals.marginPct);
              return (
                <Fragment key={group.opportunityId}>
                  <tr
                    style={{
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                      backgroundColor: colors.bgTertiary,
                    }}
                  >
                    <td style={{ padding: cellPad, verticalAlign: 'middle' }}>
                      <button
                        type="button"
                        onClick={() => toggleCollapsed(group.opportunityId)}
                        aria-expanded={!isCollapsed}
                        aria-label={isCollapsed ? 'Развернуть сделку' : 'Свернуть сделку'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 28,
                          height: 28,
                          padding: 0,
                          border: 'none',
                          borderRadius: radius.sm,
                          background: 'transparent',
                          color: colors.textSecondary,
                          cursor: 'pointer',
                          fontSize: font.sizeSm,
                        }}
                      >
                        {isCollapsed ? '▸' : '▾'}
                      </button>
                    </td>
                    <td style={{ padding: cellPad, maxWidth: 280 }}>
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          gap: spacing.xs,
                        }}
                      >
                        <span
                          title={group.dealName}
                          style={{
                            fontWeight: font.weightSemibold,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 200,
                          }}
                        >
                          {group.dealName}
                        </span>
                        {group.bitrixUrl ? (
                          <a
                            href={group.bitrixUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{
                              color: colors.accent,
                              fontSize: font.sizeXs,
                              fontWeight: font.weightMedium,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            Bitrix
                          </a>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void copyDealName(group.opportunityId, group.dealName)}
                          style={{
                            padding: '2px 6px',
                            border: `1px solid ${colors.borderSubtle}`,
                            borderRadius: radius.sm,
                            background: colors.bgSecondary,
                            color: colors.textSecondary,
                            fontSize: font.sizeXs,
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {copyToast?.id === group.opportunityId
                            ? copyToast.ok
                              ? 'Скопировано'
                              : 'Не удалось'
                            : 'Копировать'}
                        </button>
                      </div>
                    </td>
                    <td
                      style={{
                        padding: cellPad,
                        color: colors.textMuted,
                        fontSize: font.sizeXs,
                        ...moneyCellStyle,
                      }}
                    >
                      {group.rows.length} поз.
                    </td>
                    <td style={{ padding: cellPad, ...moneyCellStyle, fontWeight: font.weightMedium }}>
                      {formatSalaryRub(group.totals.sale)}
                    </td>
                    <td style={{ padding: cellPad, ...moneyCellStyle }}>
                      {formatSalaryRub(group.totals.print)}
                    </td>
                    <td style={{ padding: cellPad, ...moneyCellStyle }}>
                      {formatSalaryRub(group.totals.freza)}
                    </td>
                    <td style={{ padding: cellPad, ...moneyCellStyle }}>
                      {formatSalaryRub(group.totals.okleyka)}
                    </td>
                    <td style={{ padding: cellPad, ...moneyCellStyle }}>
                      {formatSalaryRub(group.totals.cost)}
                    </td>
                    <td style={{ padding: cellPad, ...moneyCellStyle, fontWeight: font.weightMedium }}>
                      {formatSalaryRub(group.totals.profit)}
                    </td>
                    <td
                      style={{
                        padding: cellPad,
                        ...moneyCellStyle,
                        color: groupMarginColor,
                        fontWeight: font.weightMedium,
                      }}
                    >
                      {formatMarginPct(group.totals.marginPct)}
                    </td>
                  </tr>
                  {!isCollapsed
                    ? group.rows.map((row) => (
                        <tr
                          key={row.lineItemId}
                          style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}
                        >
                          <td style={{ padding: cellPad }} />
                          <td style={{ padding: cellPad, maxWidth: 240, paddingLeft: spacing.lg }}>
                            <span
                              title={row.positionName}
                              style={{
                                display: 'block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: colors.textSecondary,
                              }}
                            >
                              {row.positionName}
                            </span>
                          </td>
                          <td style={{ padding: cellPad, ...moneyCellStyle }}>{row.qty}</td>
                          <td style={{ padding: cellPad, ...moneyCellStyle }}>
                            {formatSalaryRub(row.saleRub)}
                          </td>
                          <td style={{ padding: cellPad, ...moneyCellStyle }}>
                            {formatOptionalCost(row.printCostRub)}
                          </td>
                          <td style={{ padding: cellPad, ...moneyCellStyle }}>
                            {formatOptionalCost(row.frezaCostRub)}
                          </td>
                          <td style={{ padding: cellPad, ...moneyCellStyle }}>
                            <OkleykaCostCell
                              lineItemId={row.lineItemId}
                              valueRub={row.okleykaCostRub}
                              autoFocus={focusId === row.lineItemId}
                              onOptimistic={handleOptimistic}
                              onRollback={handleRollback}
                              onMove={onMove}
                              onFocusConsumed={handleFocusConsumed}
                            />
                          </td>
                          <td style={{ padding: cellPad }} />
                          <td style={{ padding: cellPad, ...moneyCellStyle }}>
                            {formatSalaryRub(row.profitRub)}
                          </td>
                          <td
                            style={{
                              padding: cellPad,
                              ...moneyCellStyle,
                              color: marginColor(colors, row.marginPct),
                            }}
                          >
                            {formatMarginPct(row.marginPct)}
                          </td>
                        </tr>
                      ))
                    : null}
                </Fragment>
              );
            })}
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
