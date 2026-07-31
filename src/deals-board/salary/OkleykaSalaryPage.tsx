import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { fetchOkleykaSalaryPageData, patchOkleykaDealCost } from './api';
import {

  applyDealOkleykaOverride,
  formatMarginPct,
  formatSalaryRub,
  marginPctTone,
  sortOkleykaDealGroups,
  sumOkleykaDealTotals,
  type OkleykaDealGroup,
  type OkleykaSortKey,
} from './compute';
import {

  clampSplitDay,
  DEFAULT_SPLIT_DAY,
  getCurrentMonthMode,
  periodKey,
  resolveOkleykaDateRange,
  salaryPeriodsForMode,
  type OkleykaDateMode,
} from './date-range';
import { fetchOkleykaSalaryExcelBlob } from './export-excel';
import {
  buildFundSummary,
  distributeRemainder,
  saleShareHintRub,
} from './fund';
import { OkleykaDealCostCell } from './OkleykaDealCostCell';
import { SalaryPanel } from './SalaryPanel';
import {
  fetchEntriesEndedBefore,
  fetchSalaryEntriesForPeriod,
} from './salary-entries-api';

const SORTABLE_BEFORE_COST: { key: OkleykaSortKey; label: string }[] = [
  { key: 'sale', label: 'Продажа' },
  { key: 'print', label: 'Печать' },
  { key: 'freza', label: 'Фреза' },
  { key: 'okleyka', label: 'Оклейка' },
];
const SORTABLE_AFTER_COST: { key: OkleykaSortKey; label: string }[] = [
  { key: 'profit', label: 'Прибыль' },
  { key: 'margin', label: 'Маржа' },
];

const cellPad = '10px 12px';
const moneyCellStyle: CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
  whiteSpace: 'nowrap',
};

const formatOptionalCost = (value: number): string =>
  value > 0 ? formatSalaryRub(value) : '—';

const marginColor = (colors: ThemeTokens['colors'], marginPct: number | null): string => {
  const tone = marginPctTone(marginPct);
  if (tone === 'danger') return colors.danger;
  if (tone === 'warning') return colors.warning;
  if (tone === 'ok') return colors.text;
  return colors.textMuted;
};

const yearMonthFromMode = (mode: OkleykaDateMode): { year: number; monthIndex: number } => {
  if (mode.kind === 'month' || mode.kind === 'half') {
    return { year: mode.year, monthIndex: mode.monthIndex };
  }

  const current = getCurrentMonthMode();
  return { year: current.year, monthIndex: current.monthIndex };
};

const OkleykaSalaryPageInner = () => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const queryClient = useQueryClient();
  const [refreshKey, setRefreshKey] = useState(0);
  const [splitDay, setSplitDay] = useState(DEFAULT_SPLIT_DAY);
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
  const [distributeError, setDistributeError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  const [focusId, setFocusId] = useState<string | null>(null);

  const resolved = resolveOkleykaDateRange(dateMode, splitDay);

  const dateFrom = 'dateFrom' in resolved ? resolved.dateFrom : null;

  const dateTo = 'dateTo' in resolved ? resolved.dateTo : null;

  const dateError = 'error' in resolved ? resolved.error : null;

  const query = useQuery({
    queryKey: ['okleyka-salary', refreshKey, dateFrom, dateTo],
    enabled: Boolean(dateFrom && dateTo),
    queryFn: () => fetchOkleykaSalaryPageData(dateFrom!, dateTo!),
  });

  const baseGroups = query.data ?? [];

  const displayGroups = useMemo(
    () =>
      baseGroups.map((group) =>
        Object.prototype.hasOwnProperty.call(overrides, group.opportunityId)
          ? applyDealOkleykaOverride(group, overrides[group.opportunityId] ?? null)
          : group,
      ),
    [baseGroups, overrides],
  );

  const periods = useMemo(() => salaryPeriodsForMode(dateMode, splitDay), [dateMode, splitDay]);
  const periodsKey = periods.map(periodKey).join('|');

  const entriesQuery = useQuery({
    queryKey: ['okleyka-salary-entries', periodsKey],
    enabled: periods.length > 0,
    queryFn: async () => {
      const lists = await Promise.all(periods.map((p) => fetchSalaryEntriesForPeriod(p)));
      return lists.flat();
    },
  });
  const entries = entriesQuery.data ?? [];

  const historyQuery = useQuery({
    queryKey: ['okleyka-salary-history', periods[0]?.dateFrom ?? ''],
    enabled: periods.length > 0,
    queryFn: () => fetchEntriesEndedBefore(periods[0]!.dateFrom),
  });
  const historyEntries = historyQuery.data ?? [];

  const fund = useMemo(
    () => buildFundSummary(entries, displayGroups),
    [entries, displayGroups],
  );

  const refetchEntries = () =>
    queryClient.invalidateQueries({ queryKey: ['okleyka-salary-entries', periodsKey] });

  const hintFor = (g: OkleykaDealGroup): number | null =>
    periods.length > 0 ? saleShareHintRub(g.saleRub, displayGroups, fund.fundRub) : null;

  const distribution = useMemo(
    () => distributeRemainder(displayGroups, fund.remainderRub),
    [displayGroups, fund.remainderRub],
  );

  const distributeDisabledReason =
    periods.length === 0
      ? 'Нужен месяц или полупериод'
      : fund.remainderRub <= 0
        ? 'Остаток фонда пуст'
        : distribution.length === 0
          ? 'Нет сделок без оклейки'
          : null;

  const totals = useMemo(() => sumOkleykaDealTotals(displayGroups), [displayGroups]);

  const groups = useMemo(
    () => (sort ? sortOkleykaDealGroups(displayGroups, sort.key, sort.direction) : displayGroups),
    [displayGroups, sort],
  );

  const flatIds = useMemo(() => groups.map((group) => group.opportunityId), [groups]);

  const onMove = useCallback(
    (id: string, direction: 1 | -1) => {
      const idx = flatIds.indexOf(id);
      if (idx < 0) return;

      const next = flatIds[idx + direction];
      if (next) setFocusId(next);
    },
    [flatIds],
  );

  const handleOptimistic = useCallback((id: string, next: number | null) => {
    setOverrides((prev) => ({ ...prev, [id]: next }));
  }, []);

  const handleRollback = useCallback(
    (id: string, prevRub: number | null) => {
      setOverrides((prev) => {
        const next = { ...prev };

        const server = baseGroups.find((group) => group.opportunityId === id)?.okleykaCostRub ?? null;
        if (server === prevRub) delete next[id];
        else next[id] = prevRub;
        return next;
      });
    },
    [baseGroups],
  );

  const handleDistribute = async () => {
    const total = distribution.reduce((s, d) => s + d.okleykaRub, 0);
    const confirmed = window.confirm(
      `Распределить ${formatSalaryRub(total)} по ${distribution.length} сделкам без оклейки?`,
    );
    if (!confirmed) return;
    setDistributeError(null);
    let hadFailure = false;
    for (const d of distribution) {
      const prev =
        displayGroups.find((group) => group.opportunityId === d.opportunityId)?.okleykaCostRub ??
        null;
      handleOptimistic(d.opportunityId, d.okleykaRub);
      try {
        await patchOkleykaDealCost(d.opportunityId, d.okleykaRub);
      } catch {
        hadFailure = true;
        handleRollback(d.opportunityId, prev);
      }
    }
    if (hadFailure) {
      setDistributeError('Не удалось распределить оклейку по одной или нескольким сделкам');
    }
  };

  const handleFocusConsumed = useCallback(() => {
    setFocusId(null);
  }, []);
  useEffect(() => {
    setOverrides((prev) => {
      const keys = Object.keys(prev);
      if (keys.length === 0) return prev;
      let changed = false;

      const next = { ...prev };
      for (const id of keys) {
        const group = baseGroups.find((item) => item.opportunityId === id);
        if (group && group.okleykaCostRub === prev[id]) {
          delete next[id];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [baseGroups]);

  const monthInputValue =
    dateMode.kind === 'month' || dateMode.kind === 'half'
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
      const { blob, filename } = await fetchOkleykaSalaryExcelBlob(displayGroups);

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

  const setSegment = (kind: 'month' | 'first' | 'second') => {
    const { year, monthIndex } = yearMonthFromMode(dateMode);
    if (kind === 'month') {
      setDateMode({ kind: 'month', year, monthIndex });
      return;
    }
    setDateMode({
      kind: 'half',
      year,
      monthIndex,
      half: kind === 'first' ? 'first' : 'second',
    });
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
              disabled={displayGroups.length === 0 || exportPending}
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

              const year = Number(yearStr);

              const monthIndex = Number(monthStr) - 1;
              setDateMode((prev) =>
                prev.kind === 'half'
                  ? { kind: 'half', year, monthIndex, half: prev.half }
                  : { kind: 'month', year, monthIndex },
              );
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
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: spacing.xs,
          }}
        >
          <Button
            theme={theme}
            size="sm"
            variant={dateMode.kind === 'month' ? 'primary' : 'ghost'}
            onClick={() => setSegment('month')}
          >
            Весь месяц
          </Button>
          <Button
            theme={theme}
            size="sm"
            variant={
              dateMode.kind === 'half' && dateMode.half === 'first' ? 'primary' : 'ghost'
            }
            onClick={() => setSegment('first')}
          >
            1-я половина
          </Button>
          <Button
            theme={theme}
            size="sm"
            variant={
              dateMode.kind === 'half' && dateMode.half === 'second' ? 'primary' : 'ghost'
            }
            onClick={() => setSegment('second')}
          >
            2-я половина
          </Button>
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              color: colors.textMuted,
              fontSize: font.sizeXs,
            }}
          >
            граница
            <Input
              theme={theme}
              type="number"
              min={10}
              max={25}
              value={splitDay}
              onChange={(event) => setSplitDay(clampSplitDay(Number(event.target.value)))}
              style={{ width: 56, padding: '5px 8px', fontSize: font.sizeSm }}
            />
          </label>
        </div>
      </header>
      {exportError ? (
        <div style={{ color: colors.danger, fontSize: font.sizeSm }}>{exportError}</div>
      ) : null}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', gap: spacing.md }}>
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.md,
          }}
        >
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
              Сделок <strong style={{ color: colors.text }}>{totals.deals}</strong>
            </span>
            <span>
              Позиций <strong style={{ color: colors.text }}>{totals.positions}</strong>
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
              Оклейка{' '}
              <strong style={{ color: colors.text }}>{formatSalaryRub(totals.okleyka)}</strong>
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
                  <th style={thStyle}>Сделка</th>
                  <th style={thStyle}>Позиции</th>
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

                  const groupMarginColor = marginColor(colors, group.marginPct);
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
                          {group.positions.length} поз.
                        </td>
                        <td
                          style={{
                            padding: cellPad,
                            ...moneyCellStyle,
                            fontWeight: font.weightMedium,
                          }}
                        >
                          {formatSalaryRub(group.saleRub)}
                        </td>
                        <td style={{ padding: cellPad, ...moneyCellStyle }}>
                          {formatOptionalCost(group.printCostRub)}
                        </td>
                        <td style={{ padding: cellPad, ...moneyCellStyle }}>
                          {formatOptionalCost(group.frezaCostRub)}
                        </td>
                        <td style={{ padding: cellPad, ...moneyCellStyle }}>
                          <OkleykaDealCostCell
                            opportunityId={group.opportunityId}
                            valueRub={group.okleykaCostRub}
                            hintRub={hintFor(group)}
                            autoFocus={focusId === group.opportunityId}
                            onOptimistic={handleOptimistic}
                            onRollback={handleRollback}
                            onMove={onMove}
                            onFocusConsumed={handleFocusConsumed}
                          />
                        </td>
                        <td style={{ padding: cellPad, ...moneyCellStyle }}>
                          {formatSalaryRub(group.costRub)}
                        </td>
                        <td
                          style={{
                            padding: cellPad,
                            ...moneyCellStyle,
                            fontWeight: font.weightMedium,
                          }}
                        >
                          {formatSalaryRub(group.profitRub)}
                        </td>
                        <td
                          style={{
                            padding: cellPad,
                            ...moneyCellStyle,
                            color: groupMarginColor,
                            fontWeight: font.weightMedium,
                          }}
                        >
                          {formatMarginPct(group.marginPct)}
                        </td>
                      </tr>
                      {!isCollapsed
                        ? group.positions.map((position) => (
                            <tr
                              key={position.lineItemId}
                              style={{ borderBottom: `1px solid ${colors.borderSubtle}` }}
                            >
                              <td style={{ padding: cellPad }} />
                              <td style={{ padding: cellPad }} />
                              <td style={{ padding: cellPad, maxWidth: 240 }}>
                                <span
                                  title={position.positionName}
                                  style={{
                                    display: 'block',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                    color: colors.textSecondary,
                                  }}
                                >
                                  {position.positionName}
                                </span>
                                <span
                                  style={{
                                    display: 'block',
                                    color: colors.textMuted,
                                    fontSize: font.sizeXs,
                                    ...moneyCellStyle,
                                  }}
                                >
                                  {position.qty} × {formatSalaryRub(position.unitPriceRub)}
                                </span>
                              </td>
                              <td style={{ padding: cellPad, ...moneyCellStyle }}>
                                {formatSalaryRub(position.saleRub)}
                              </td>
                              <td style={{ padding: cellPad }} />
                              <td style={{ padding: cellPad }} />
                              <td style={{ padding: cellPad }} />
                              <td style={{ padding: cellPad }} />
                              <td style={{ padding: cellPad }} />
                              <td style={{ padding: cellPad }} />
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
        <aside style={{ width: 320, flexShrink: 0, minHeight: 0, overflow: 'auto' }}>
          {distributeError ? (
            <div
              style={{
                color: colors.danger,
                fontSize: font.sizeXs,
                marginBottom: spacing.xs,
              }}
            >
              {distributeError}
            </div>
          ) : null}
          <SalaryPanel
            periods={periods}
            entries={entries}
            historyEntries={historyEntries}
            fund={fund}
            isLoading={entriesQuery.isLoading || historyQuery.isLoading}
            onChanged={refetchEntries}
            onDistribute={() => void handleDistribute()}
            distributeDisabledReason={distributeDisabledReason}
          />
        </aside>
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
