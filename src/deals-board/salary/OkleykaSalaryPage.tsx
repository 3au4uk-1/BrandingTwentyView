import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query';
import { Fragment, useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { Chip, getChipPalette, type ChipColor } from '../Chip';
import {
  useLineItemListStatus,
  usePrefetchLineItemListStatuses,
} from '../hooks/useLineItemListStatus';
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
import { getLineItemTypeColor, getLineItemTypeLabel } from 'src/constants/line-item-types';
import { getStageColor, getStageLabel } from 'src/constants/stages';
import { fetchOkleykaSalaryFullPageData, fetchOkleykaSalaryPageData, patchOkleykaDealCost } from './api';
import {

  applyDealOkleykaOverride,
  formatMarginPct,
  formatOkleykaEventDate,
  formatOkleykaShareCaption,
  formatSalaryRub,
  marginPctTone,
  sortOkleykaDealGroups,
  sumOkleykaDealTotals,
  type OkleykaSortKey,
  type OkleykaViewMode,
} from './compute';
import { buildCopySrcDoc, COPY_DONE_MESSAGE_TYPE } from '../utils/copy-text';
import {

  clampSplitDay,
  DEFAULT_SPLIT_DAY,
  entryHalf,
  getCurrentMonthMode,
  halfPeriod,
  inferSplitDayFromEntries,
  monthKeyOf,
  readStoredSplitDay,
  resolveOkleykaDateRange,
  salaryPeriodsForMode,
  storeSplitDay,
  type OkleykaDateMode,
  type OkleykaHalf,
} from './date-range';
import { fetchOkleykaSalaryExcelBlob } from './export-excel';
import {
  buildFundSummary,
  entrySumRub,
  filledOkleykaDealIds,
  filterGroupsInPeriod,
} from './fund';
import { PersonShareCell } from './PersonShareCell';
import { countRestorationMatches } from './restoration-count';
import { SalaryPanel } from './SalaryPanel';
import {
  deleteShares,
  fetchSharesForOpportunities,
  upsertShare,
} from './shares-api';
import { planHalfPersonDistribute, sumSharesByOpportunity } from './shares';
import {
  fetchEntriesEndedBefore,
  fetchSalaryEntriesForMonth,
  updateSalaryEntry,
} from './salary-entries-api';

const SORTABLE_BEFORE_COST: { key: OkleykaSortKey; label: string }[] = [
  { key: 'sale', label: 'Продажа' },
  { key: 'print', label: 'Печать' },
  { key: 'freza', label: 'Фреза' },
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

const PositionNameCell = ({
  lineItemId,
  positionName,
  showMeta = false,
  tip,
  stage,
  isQualifying = false,
  isCancelled = false,
}: {
  lineItemId: string;
  positionName: string;
  showMeta?: boolean;
  tip?: string | null;
  stage?: string | null;
  isQualifying?: boolean;
  isCancelled?: boolean;
}) => {
  const theme = useTheme();
  const { colors } = theme;
  const { data } = useLineItemListStatus(lineItemId);
  const nameColor = isCancelled
    ? colors.textMuted
    : isQualifying
      ? getChipPalette('blue', theme.colorScheme).text
      : colors.textSecondary;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <span
        title={positionName}
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: nameColor,
          fontWeight: isQualifying ? theme.font.weightSemibold : undefined,
          minWidth: 0,
          flex: 1,
        }}
      >
        {positionName}
      </span>
      {showMeta && tip ? (
        <Chip text={getLineItemTypeLabel(tip)} color={getLineItemTypeColor(tip) as ChipColor} theme={theme} />
      ) : null}
      {showMeta && stage ? (
        <Chip text={getStageLabel(stage)} color={getStageColor(stage) as ChipColor} theme={theme} />
      ) : null}
      {data?.restorationMatch ? (
        <Chip text="реставрация · 0 ₽" color="yellow" theme={theme} />
      ) : null}
    </div>
  );
};

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
  const [copyRequest, setCopyRequest] = useState<{ id: string; srcDoc: string } | null>(null);
  const [distributeError, setDistributeError] = useState<string | null>(null);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});
  const [viewMode, setViewMode] = useState<OkleykaViewMode>('okleyka');
  const [fullError, setFullError] = useState<string | null>(null);

  const { year, monthIndex } = yearMonthFromMode(dateMode);
  const monthKey = monthKeyOf(year, monthIndex);
  const [splitDay, setSplitDay] = useState(
    () => readStoredSplitDay(year, monthIndex) ?? DEFAULT_SPLIT_DAY,
  );
  const [splitDraft, setSplitDraft] = useState<string | null>(null);
  useEffect(() => {
    setSplitDay(readStoredSplitDay(year, monthIndex) ?? DEFAULT_SPLIT_DAY);
    setSplitDraft(null);
    setSplitError(null);
  }, [year, monthIndex]);

  const resolved = resolveOkleykaDateRange(dateMode, splitDay);

  const dateFrom = 'dateFrom' in resolved ? resolved.dateFrom : null;

  const dateTo = 'dateTo' in resolved ? resolved.dateTo : null;

  const dateError = 'error' in resolved ? resolved.error : null;

  const query = useQuery({
    queryKey: ['okleyka-salary', refreshKey, dateFrom, dateTo],
    enabled: Boolean(dateFrom && dateTo),
    queryFn: () => fetchOkleykaSalaryPageData(dateFrom!, dateTo!),
  });

  const compactOpportunityIds = useMemo(
    () => (query.data ?? []).map((g) => g.opportunityId),
    [query.data],
  );
  const compactOpportunityIdsKey = compactOpportunityIds.join(',');

  const fullQuery = useQuery({
    queryKey: ['okleyka-salary-full', refreshKey, dateFrom, dateTo, compactOpportunityIdsKey],
    queryFn: () => fetchOkleykaSalaryFullPageData(dateFrom!, dateTo!, compactOpportunityIds),
    enabled: false,
  });

  const requestFullMode = useCallback(async () => {
    setFullError(null);
    if (compactOpportunityIds.length === 0) {
      setViewMode('full');
      return;
    }
    try {
      await queryClient.fetchQuery({
        queryKey: ['okleyka-salary-full', refreshKey, dateFrom, dateTo, compactOpportunityIdsKey],
        queryFn: () =>
          fetchOkleykaSalaryFullPageData(dateFrom!, dateTo!, compactOpportunityIds),
      });
      setViewMode('full');
    } catch {
      setViewMode('okleyka');
      setFullError('Не удалось загрузить все позиции');
    }
  }, [
    compactOpportunityIds,
    compactOpportunityIdsKey,
    dateFrom,
    dateTo,
    queryClient,
    refreshKey,
  ]);

  useEffect(() => {
    if (viewMode !== 'full') return;
    if (!dateFrom || !dateTo) return;
    if (fullQuery.data) return;
    void requestFullMode();
  }, [viewMode, dateFrom, dateTo, compactOpportunityIdsKey, refreshKey, fullQuery.data, requestFullMode]);

  const baseGroups = viewMode === 'full' ? (fullQuery.data ?? []) : (query.data ?? []);

  const displayGroups = useMemo(
    () =>
      baseGroups.map((group) =>
        Object.prototype.hasOwnProperty.call(overrides, group.opportunityId)
          ? applyDealOkleykaOverride(group, overrides[group.opportunityId] ?? null)
          : group,
      ),
    [baseGroups, overrides],
  );

  const lineItemIds = useMemo(
    () => displayGroups.flatMap((g) => g.positions.map((p) => p.lineItemId)),
    [displayGroups],
  );
  const listStatusQuery = usePrefetchLineItemListStatuses(
    lineItemIds,
    lineItemIds.length > 0,
  );
  const restorationCount = useMemo(() => {
    const statuses = listStatusQuery.data
      ? lineItemIds.map((id) => listStatusQuery.data?.[id])
      : [];
    return countRestorationMatches(statuses);
  }, [listStatusQuery.data, lineItemIds]);

  const periods = useMemo(() => salaryPeriodsForMode(dateMode, splitDay), [dateMode, splitDay]);

  const entriesQuery = useQuery({
    queryKey: ['okleyka-salary-entries', monthKey],
    enabled: periods.length > 0,
    queryFn: () => fetchSalaryEntriesForMonth(year, monthIndex),
  });
  const monthEntries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);

  // Remember the split day chosen for this month: saved entries are the shared
  // source of truth, localStorage covers months without entries yet.
  useEffect(() => {
    if (monthEntries.length === 0) return;
    if (readStoredSplitDay(year, monthIndex) !== null) return;
    const inferred = inferSplitDayFromEntries(monthEntries);
    if (inferred !== null) {
      setSplitDay((current) => (current === inferred ? current : inferred));
    }
  }, [monthEntries, year, monthIndex]);

  const historyQuery = useQuery({
    queryKey: ['okleyka-salary-history', periods[0]?.dateFrom ?? ''],
    enabled: periods.length > 0,
    queryFn: () => fetchEntriesEndedBefore(periods[0]!.dateFrom),
  });
  const historyEntries = historyQuery.data ?? [];

  const refetchEntries = () =>
    queryClient.invalidateQueries({ queryKey: ['okleyka-salary-entries', monthKey] });

  const halfDistribute = useMemo(() => {
    if (dateMode.kind === 'range') return [];
    const halves: OkleykaHalf[] =
      dateMode.kind === 'half' ? [dateMode.half] : ['first', 'second'];
    return halves.map((half) => {
      const period = halfPeriod(year, monthIndex, half, splitDay);
      const halfEntries = monthEntries.filter((e) => entryHalf(e.periodStart) === half);
      const halfGroups = filterGroupsInPeriod(displayGroups, period);
      const opportunityIds = halfGroups.map((group) => group.opportunityId);
      const planned = planHalfPersonDistribute({ entries: halfEntries, opportunityIds });
      const fund = buildFundSummary(halfEntries, halfGroups);
      const distributionTotalRub = halfEntries.reduce((sum, entry) => sum + entrySumRub(entry), 0);
      const disabledReason =
        halfEntries.length === 0
          ? 'Нет людей в периоде'
          : opportunityIds.length === 0
            ? 'Нет сделок в периоде'
            : planned.length === 0
              ? 'Нечего распределять'
              : null;
      return {
        half,
        fund,
        distributionTotalRub,
        distributionCount: opportunityIds.length,
        disabledReason,
      };
    });
  }, [dateMode, year, monthIndex, splitDay, monthEntries, displayGroups]);

  /**
   * Changing the boundary moves the existing entries of this month onto the
   * new period dates, so the people list never resets.
   */
  const commitSplitDay = async (raw: string) => {
    setSplitDraft(null);
    if (!raw.trim() || !Number.isFinite(Number(raw))) return;
    const next = clampSplitDay(Number(raw));
    if (next === splitDay) return;
    setSplitError(null);
    setSplitDay(next);
    storeSplitDay(year, monthIndex, next);

    const first = halfPeriod(year, monthIndex, 'first', next);
    const second = halfPeriod(year, monthIndex, 'second', next);
    const stale = monthEntries.filter((e) => {
      const target = entryHalf(e.periodStart) === 'first' ? first : second;
      return e.periodStart !== target.dateFrom || e.periodEnd !== target.dateTo;
    });
    if (stale.length === 0) return;
    const results = await Promise.allSettled(
      stale.map((e) => {
        const target = entryHalf(e.periodStart) === 'first' ? first : second;
        return updateSalaryEntry(e.id, {
          periodStart: target.dateFrom,
          periodEnd: target.dateTo,
        });
      }),
    );
    if (results.some((r) => r.status === 'rejected')) {
      setSplitError('Не удалось перенести часть записей на новые даты периода');
    }
    void refetchEntries();
  };

  const totals = useMemo(() => sumOkleykaDealTotals(displayGroups), [displayGroups]);

  const groups = useMemo(() => {
    if (sort) return sortOkleykaDealGroups(displayGroups, sort.key, sort.direction);
    return sortOkleykaDealGroups(displayGroups, 'date', 'asc');
  }, [displayGroups, sort]);

  const flatIds = useMemo(() => groups.map((group) => group.opportunityId), [groups]);
  const opportunityIdsKey = flatIds.join(',');

  const sharesQuery = useQuery({
    queryKey: ['okleyka-shares', opportunityIdsKey],
    enabled: flatIds.length > 0,
    queryFn: () => fetchSharesForOpportunities(flatIds),
  });
  const allShares = sharesQuery.data ?? [];

  const sharesByKey = useMemo(() => {
    const map = new Map<string, (typeof allShares)[number]>();
    for (const share of allShares) {
      map.set(`${share.opportunityId}:${share.salaryEntryId}`, share);
    }
    return map;
  }, [allShares]);

  const sharesByOpportunity = useMemo(() => {
    const map = new Map<string, typeof allShares>();
    for (const share of allShares) {
      const list = map.get(share.opportunityId) ?? [];
      list.push(share);
      map.set(share.opportunityId, list);
    }
    return map;
  }, [allShares]);

  const dealShareSumByOpportunity = useMemo(
    () => sumSharesByOpportunity(allShares),
    [allShares],
  );

  const visiblePersonEntries = useMemo(() => {
    if (dateMode.kind === 'range') return [];
    const halves: OkleykaHalf[] =
      dateMode.kind === 'half' ? [dateMode.half] : ['first', 'second'];
    return monthEntries
      .filter((entry) => halves.includes(entryHalf(entry.periodStart)))
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [dateMode, monthEntries]);

  const tableColSpan = (viewMode === 'full' ? 13 : 11) + visiblePersonEntries.length;

  const handlePersisted = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['okleyka-salary'] });
    void queryClient.invalidateQueries({ queryKey: ['okleyka-salary-full'] });
    void queryClient.invalidateQueries({ queryKey: ['okleyka-shares'] });
  }, [queryClient]);

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

  const invalidateSharesAndSalary = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['okleyka-salary'] });
    void queryClient.invalidateQueries({ queryKey: ['okleyka-salary-full'] });
    void queryClient.invalidateQueries({ queryKey: ['okleyka-shares'] });
  }, [queryClient]);

  const dealOkleykaAfterPlannedShares = (
    opportunityId: string,
    existingShares: Array<{ opportunityId: string; salaryEntryId: string; amountRub: number }>,
    planned: Array<{ opportunityId: string; salaryEntryId: string; amountRub: number }>,
  ): number => {
    const plannedForDeal = planned.filter((row) => row.opportunityId === opportunityId);
    const plannedEntryIds = new Set(plannedForDeal.map((row) => row.salaryEntryId));
    let sum = 0;
    for (const share of existingShares) {
      if (share.opportunityId !== opportunityId) continue;
      if (plannedEntryIds.has(share.salaryEntryId)) continue;
      sum += share.amountRub;
    }
    for (const row of plannedForDeal) sum += row.amountRub;
    return sum;
  };

  const handleDistributeHalf = async (half: OkleykaHalf) => {
    setDistributeError(null);
    const period = halfPeriod(year, monthIndex, half, splitDay);
    const halfEntries = monthEntries.filter((e) => entryHalf(e.periodStart) === half);
    const halfGroups = filterGroupsInPeriod(displayGroups, period);
    const opportunityIds = halfGroups.map((group) => group.opportunityId);
    const planned = planHalfPersonDistribute({ entries: halfEntries, opportunityIds });
    if (planned.length === 0) return;

    let existingShares;
    try {
      existingShares = await fetchSharesForOpportunities(opportunityIds);
    } catch {
      setDistributeError('Не удалось загрузить доли по сделкам');
      return;
    }

    const existingByKey = new Map(
      existingShares.map((share) => [`${share.opportunityId}:${share.salaryEntryId}`, share]),
    );

    let hadFailure = false;
    for (const row of planned) {
      const existing = existingByKey.get(`${row.opportunityId}:${row.salaryEntryId}`);
      try {
        await upsertShare({ ...row, existingId: existing?.id });
      } catch {
        hadFailure = true;
      }
    }

    for (const opportunityId of opportunityIds) {
      const nextRub = dealOkleykaAfterPlannedShares(opportunityId, existingShares, planned);
      const prev =
        displayGroups.find((group) => group.opportunityId === opportunityId)?.okleykaCostRub ?? null;
      const nextCost = nextRub > 0 ? nextRub : null;
      handleOptimistic(opportunityId, nextCost);
      try {
        await patchOkleykaDealCost(opportunityId, nextCost);
      } catch {
        hadFailure = true;
        handleRollback(opportunityId, prev);
      }
    }

    if (hadFailure) {
      setDistributeError('Не удалось распределить оклейку по одной или нескольким сделкам');
    } else {
      invalidateSharesAndSalary();
    }
  };

  const handleResetOkleyka = async () => {
    setDistributeError(null);
    const opportunityIds = displayGroups.map((group) => group.opportunityId);
    if (opportunityIds.length === 0) return;

    let existingShares;
    try {
      existingShares = await fetchSharesForOpportunities(opportunityIds);
    } catch {
      setDistributeError('Не удалось загрузить доли по сделкам');
      return;
    }

    let hadFailure = false;
    try {
      await deleteShares(existingShares.map((share) => share.id));
    } catch {
      hadFailure = true;
    }

    const dealIdsToClear = new Set([
      ...filledOkleykaDealIds(displayGroups),
      ...existingShares.map((share) => share.opportunityId),
    ]);

    for (const id of dealIdsToClear) {
      const prev = displayGroups.find((group) => group.opportunityId === id)?.okleykaCostRub ?? null;
      handleOptimistic(id, null);
      try {
        await patchOkleykaDealCost(id, null);
      } catch {
        hadFailure = true;
        handleRollback(id, prev);
      }
    }

    if (hadFailure) {
      setDistributeError('Не удалось сбросить оклейку по одной или нескольким сделкам');
    } else if (dealIdsToClear.size > 0 || existingShares.length > 0) {
      invalidateSharesAndSalary();
    }
  };

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
  useEffect(() => {
    if (!copyRequest) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; ok?: boolean } | null;
      if (data?.type === COPY_DONE_MESSAGE_TYPE) {
        setCopyToast({ id: copyRequest.id, ok: Boolean(data.ok) });
        setCopyRequest(null);
      }
    };
    window.addEventListener('message', onMessage);

    const timer = globalThis.setTimeout?.(() => {
      setCopyToast({ id: copyRequest.id, ok: false });
      setCopyRequest(null);
    }, 3_000);
    return () => {
      window.removeEventListener('message', onMessage);
      if (timer != null) globalThis.clearTimeout?.(timer);
    };
  }, [copyRequest]);

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

  const copyDealName = (opportunityId: string, dealName: string) => {
    setCopyToast(null);
    setCopyRequest({ id: opportunityId, srcDoc: buildCopySrcDoc(dealName) });
  };

  const handleExportExcel = async () => {
    setExportError(null);
    setExportPending(true);
    revokePendingDownload(pendingDownload);
    setPendingDownload(null);
    setDownloadSrcDoc(null);
    try {
      const { blob, filename } = await fetchOkleykaSalaryExcelBlob(displayGroups, viewMode);

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
      {copyRequest ? (
        <iframe
          title="okleyka-copy"
          srcDoc={copyRequest.srcDoc}
          sandbox="allow-scripts allow-same-origin"
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
          <Button
            theme={theme}
            size="sm"
            variant={viewMode === 'okleyka' ? 'primary' : 'ghost'}
            onClick={() => {
              setFullError(null);
              setViewMode('okleyka');
            }}
          >
            Оклейка
          </Button>
          <Button
            theme={theme}
            size="sm"
            variant={viewMode === 'full' ? 'primary' : 'ghost'}
            disabled={fullQuery.isFetching}
            onClick={() => void requestFullMode()}
          >
            {fullQuery.isFetching ? 'Вся сделка…' : 'Вся сделка'}
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
              value={splitDraft ?? String(splitDay)}
              onChange={(event) => setSplitDraft(event.target.value)}
              onBlur={(event) => void commitSplitDay(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  void commitSplitDay((event.target as HTMLInputElement).value);
                }
              }}
              style={{ width: 56, padding: '5px 8px', fontSize: font.sizeSm }}
            />
          </label>
          {splitError ? (
            <span style={{ color: colors.danger, fontSize: font.sizeXs }}>{splitError}</span>
          ) : null}
        </div>
      </header>
      {exportError ? (
        <div style={{ color: colors.danger, fontSize: font.sizeSm }}>{exportError}</div>
      ) : null}
      {fullError ? (
        <div style={{ color: colors.danger, fontSize: font.sizeSm }}>{fullError}</div>
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
            {viewMode === 'full' ? (
              <>
                <span>
                  Логистика{' '}
                  <strong style={{ color: colors.text }}>{formatSalaryRub(totals.logistics)}</strong>
                </span>
                <span>
                  Безнал{' '}
                  <strong style={{ color: colors.text }}>{formatSalaryRub(totals.beznal)}</strong>
                </span>
              </>
            ) : null}
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
                  {renderSortableHeader('date', 'Дата')}
                  <th style={thStyle}>Сделка</th>
                  <th style={thStyle}>Позиции</th>
                  {SORTABLE_BEFORE_COST.map(({ key, label }) => renderSortableHeader(key, label))}
                  {viewMode === 'full' ? (
                    <>
                      <th style={thStyle}>Логистика</th>
                      <th style={thStyle}>Безнал</th>
                    </>
                  ) : null}
                  {visiblePersonEntries.map((entry) => (
                    <th
                      key={entry.id}
                      style={thStyle}
                      title={entry.name}
                    >
                      {entry.name}
                    </th>
                  ))}
                  <th style={thStyle}>Сумма</th>
                  <th style={thStyle}>Расход</th>
                  {SORTABLE_AFTER_COST.map(({ key, label }) => renderSortableHeader(key, label))}
                </tr>
              </thead>
              <tbody>
                {groups.length === 0 && !query.isLoading && !fullQuery.isFetching ? (
                  <tr>
                    <td colSpan={tableColSpan} style={{ padding: spacing.lg, color: colors.textMuted }}>
                      Нет подходящих позиций
                    </td>
                  </tr>
                ) : null}
                {groups.map((group) => {
                  const isCollapsed = collapsed.has(group.opportunityId);
                  const dealShares = sharesByOpportunity.get(group.opportunityId) ?? [];
                  const dealShareSum =
                    dealShareSumByOpportunity.get(group.opportunityId) ??
                    group.okleykaCostRub ??
                    0;

                  const groupMarginColor = marginColor(colors, group.marginPct);
                  return (
                    <Fragment key={group.opportunityId}>
                      <tr
                        style={{
                          borderBottom: `1px solid ${colors.borderSubtle}`,
                          backgroundColor:
                            dealShareSum > 0 ? colors.successMuted : colors.bgTertiary,
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
                        <td
                          style={{
                            padding: cellPad,
                            color: colors.textSecondary,
                            fontSize: font.sizeXs,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {formatOkleykaEventDate(group.eventDate)}
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
                              onClick={() => copyDealName(group.opportunityId, group.dealName)}
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
                          <div>{formatSalaryRub(group.saleRub)}</div>
                          {viewMode === 'full' && formatOkleykaShareCaption(group.okleykaSharePct) ? (
                            <div style={{ color: colors.textMuted, fontSize: font.sizeXs }}>
                              {formatOkleykaShareCaption(group.okleykaSharePct)}
                            </div>
                          ) : null}
                        </td>
                        <td style={{ padding: cellPad, ...moneyCellStyle }}>
                          {formatOptionalCost(group.printCostRub)}
                        </td>
                        <td style={{ padding: cellPad, ...moneyCellStyle }}>
                          {formatOptionalCost(group.frezaCostRub)}
                        </td>
                        {viewMode === 'full' ? (
                          <>
                            <td style={{ padding: cellPad, ...moneyCellStyle }}>
                              {formatOptionalCost(group.logisticsCostRub)}
                            </td>
                            <td style={{ padding: cellPad, ...moneyCellStyle }}>
                              {formatOptionalCost(group.beznalCostRub)}
                            </td>
                          </>
                        ) : null}
                        {visiblePersonEntries.map((entry) => (
                          <td key={entry.id} style={{ padding: cellPad, ...moneyCellStyle }}>
                            <PersonShareCell
                              opportunityId={group.opportunityId}
                              salaryEntryId={entry.id}
                              share={sharesByKey.get(`${group.opportunityId}:${entry.id}`) ?? null}
                              dealShares={dealShares}
                              onOptimisticDealCost={handleOptimistic}
                              onRollbackDealCost={handleRollback}
                              onPersisted={handlePersisted}
                            />
                          </td>
                        ))}
                        <td
                          style={{
                            padding: cellPad,
                            ...moneyCellStyle,
                            fontWeight: font.weightSemibold,
                          }}
                        >
                          {dealShareSum > 0 ? formatSalaryRub(dealShareSum) : '—'}
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
                              style={{
                                borderBottom: `1px solid ${colors.borderSubtle}`,
                                color: position.isCancelled ? colors.textMuted : undefined,
                              }}
                            >
                              <td style={{ padding: cellPad }} />
                              <td style={{ padding: cellPad }} />
                              <td style={{ padding: cellPad }} />
                              <td style={{ padding: cellPad, maxWidth: 240 }}>
                                <PositionNameCell
                                  lineItemId={position.lineItemId}
                                  positionName={position.positionName}
                                  showMeta={viewMode === 'full'}
                                  tip={position.tip}
                                  stage={position.stage}
                                  isQualifying={position.isQualifying}
                                  isCancelled={position.isCancelled}
                                />
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
                                {position.isCancelled ? '—' : formatSalaryRub(position.saleRub)}
                              </td>
                              <td style={{ padding: cellPad }} />
                              <td style={{ padding: cellPad }} />
                              {viewMode === 'full' ? (
                                <>
                                  <td />
                                  <td />
                                </>
                              ) : null}
                              {visiblePersonEntries.map((entry) => (
                                <td key={entry.id} style={{ padding: cellPad }} />
                              ))}
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
        <aside style={{ width: 360, flexShrink: 0, minHeight: 0, overflow: 'auto' }}>
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
          <div
            style={{
              fontSize: font.sizeSm,
              color: colors.textSecondary,
              marginBottom: spacing.xs,
            }}
          >
            Реставрации:{' '}
            <strong style={{ color: colors.text }}>{restorationCount}</strong>
          </div>
          <SalaryPanel
            periods={periods}
            entries={monthEntries}
            historyEntries={historyEntries}
            isLoading={entriesQuery.isLoading || historyQuery.isLoading}
            onChanged={refetchEntries}
            halfDistribute={halfDistribute}
            onDistributeHalf={(half) => void handleDistributeHalf(half)}
            filledOkleykaCount={filledOkleykaDealIds(displayGroups).length}
            onResetOkleyka={() => void handleResetOkleyka()}
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
