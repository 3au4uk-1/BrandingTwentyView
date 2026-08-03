import { useMemo, useState, type KeyboardEvent } from 'react';

import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatSalaryRub } from './compute';
import {
  entryHalf,
  formatPeriodLabel,
  type OkleykaHalf,
  type SalaryPeriod,
} from './date-range';
import {
  createSalaryEntry,
  deleteSalaryEntry,
  updateSalaryEntry,
} from './salary-entries-api';
import {
  DISTRIBUTE_RULES,
  entrySumRub,
  latestRateByName,
  pickPreviousPeriodEntries,
  type DistributeRule,
  type OkleykaSalaryEntry,
} from './fund';

export type HalfDistributeUi = {
  half: OkleykaHalf;
  fund: { fundRub: number; spentRub: number; remainderRub: number };
  distributionTotalRub: number;
  distributionCount: number;
  disabledReason: string | null;
};

type SalaryPanelProps = {
  periods: SalaryPeriod[];
  entries: OkleykaSalaryEntry[];
  historyEntries: OkleykaSalaryEntry[];
  isLoading: boolean;
  onChanged: () => void;
  distributeRule: DistributeRule;
  onDistributeRuleChange: (rule: DistributeRule) => void;
  /** One item in half mode; two in month mode; empty in range. */
  halfDistribute: HalfDistributeUi[];
  onDistributeHalf: (half: OkleykaHalf) => void;
};

const distributeButtonLabel = (half: OkleykaHalf, monthMode: boolean): string => {
  if (!monthMode) return 'Раскидать';
  return half === 'first' ? 'Раскидать 1-ю' : 'Раскидать 2-ю';
};

const parseNonNegative = (raw: string): number | null => {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) return null;
  return parsed;
};

type EntryRowProps = {
  entry: OkleykaSalaryEntry;
  busy: boolean;
  onBusy: (value: boolean) => void;
  onChanged: () => void;
  onError: (message: string) => void;
  onClearError: () => void;
};

const EntryRow = ({ entry, busy, onBusy, onChanged, onError, onClearError }: EntryRowProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const [hoursDraft, setHoursDraft] = useState(String(entry.hours));
  const [rateDraft, setRateDraft] = useState(String(entry.rateRub));

  const commitHours = async () => {
    const parsed = parseNonNegative(hoursDraft);
    if (parsed === null) {
      setHoursDraft(String(entry.hours));
      return;
    }
    if (parsed === entry.hours) return;
    onClearError();
    onBusy(true);
    try {
      await updateSalaryEntry(entry.id, { hours: parsed });
      onChanged();
    } catch (error) {
      setHoursDraft(String(entry.hours));
      onError(error instanceof Error ? error.message : 'Ошибка сохранения');
    } finally {
      onBusy(false);
    }
  };

  const commitRate = async () => {
    const parsed = parseNonNegative(rateDraft);
    if (parsed === null) {
      setRateDraft(String(entry.rateRub));
      return;
    }
    if (parsed === entry.rateRub) return;
    onClearError();
    onBusy(true);
    try {
      await updateSalaryEntry(entry.id, { rateRub: parsed });
      onChanged();
    } catch (error) {
      setRateDraft(String(entry.rateRub));
      onError(error instanceof Error ? error.message : 'Ошибка сохранения');
    } finally {
      onBusy(false);
    }
  };

  const handleDelete = async () => {
    onClearError();
    onBusy(true);
    try {
      await deleteSalaryEntry(entry.id);
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Ошибка сохранения');
    } finally {
      onBusy(false);
    }
  };

  const onEnterCommit = (event: KeyboardEvent<HTMLInputElement>, commit: () => void) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      void commit();
    }
  };

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 56px 72px auto 24px',
        gap: spacing.xs,
        alignItems: 'center',
        fontSize: font.sizeSm,
      }}
    >
      <span
        title={entry.name}
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          fontWeight: font.weightMedium,
        }}
      >
        {entry.name}
      </span>
      <Input
        theme={theme}
        type="number"
        min={0}
        step="any"
        value={hoursDraft}
        disabled={busy}
        onChange={(event) => {
          onClearError();
          setHoursDraft(event.target.value);
        }}
        onBlur={() => void commitHours()}
        onKeyDown={(event) => onEnterCommit(event, commitHours)}
        style={{ width: 56, padding: '4px 6px', fontSize: font.sizeXs }}
      />
      <Input
        theme={theme}
        type="number"
        min={0}
        step="any"
        value={rateDraft}
        disabled={busy}
        onChange={(event) => {
          onClearError();
          setRateDraft(event.target.value);
        }}
        onBlur={() => void commitRate()}
        onKeyDown={(event) => onEnterCommit(event, commitRate)}
        style={{ width: 72, padding: '4px 6px', fontSize: font.sizeXs }}
      />
      <span style={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', fontSize: font.sizeXs }}>
        {formatSalaryRub(entrySumRub({ ...entry, hours: Number(hoursDraft) || 0, rateRub: Number(rateDraft) || 0 }))}
      </span>
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleDelete()}
        aria-label="Удалить"
        style={{
          width: 24,
          height: 24,
          padding: 0,
          border: 'none',
          borderRadius: radius.sm,
          background: 'transparent',
          color: colors.textMuted,
          cursor: busy ? 'wait' : 'pointer',
          fontSize: font.sizeSm,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
};

type PeriodSectionProps = {
  period: SalaryPeriod;
  periodEntries: OkleykaSalaryEntry[];
  historyEntries: OkleykaSalaryEntry[];
  sameMonthPreviousEntries: OkleykaSalaryEntry[];
  nameSuggestions: string[];
  busy: boolean;
  onBusy: (value: boolean) => void;
  onChanged: () => void;
  onError: (message: string) => void;
  onClearError: () => void;
};

const PeriodSection = ({
  period,
  periodEntries,
  historyEntries,
  sameMonthPreviousEntries,
  nameSuggestions,
  busy,
  onBusy,
  onChanged,
  onError,
  onClearError,
}: PeriodSectionProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const datalistId = `okleyka-names-${period.dateFrom}-${period.dateTo}`;
  const [addName, setAddName] = useState('');
  const [addHours, setAddHours] = useState('');
  const [addRate, setAddRate] = useState('');
  const [rateTouched, setRateTouched] = useState(false);

  const previousEntries = useMemo(
    () =>
      sameMonthPreviousEntries.length > 0
        ? sameMonthPreviousEntries
        : pickPreviousPeriodEntries(historyEntries),
    [sameMonthPreviousEntries, historyEntries],
  );

  const handleNameChange = (name: string) => {
    onClearError();
    setAddName(name);
    if (!rateTouched) {
      const rate = latestRateByName(historyEntries, name);
      if (rate !== null) setAddRate(String(rate));
    }
  };

  const handleAdd = async () => {
    const name = addName.trim();
    if (!name) return;
    const hours = parseNonNegative(addHours) ?? 0;
    const rateRub = parseNonNegative(addRate) ?? 0;
    onClearError();
    onBusy(true);
    try {
      await createSalaryEntry({
        name,
        hours,
        rateRub,
        periodStart: period.dateFrom,
        periodEnd: period.dateTo,
      });
      setAddName('');
      setAddHours('');
      setAddRate('');
      setRateTouched(false);
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Ошибка сохранения');
    } finally {
      onBusy(false);
    }
  };

  const handleCopyFromPrevious = async () => {
    if (previousEntries.length === 0) return;
    onClearError();
    onBusy(true);
    try {
      for (const prev of previousEntries) {
        await createSalaryEntry({
          name: prev.name,
          hours: 0,
          rateRub: prev.rateRub,
          periodStart: period.dateFrom,
          periodEnd: period.dateTo,
        });
      }
      onChanged();
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Ошибка сохранения');
    } finally {
      onBusy(false);
    }
  };

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
      <h3
        style={{
          margin: 0,
          fontSize: font.sizeSm,
          fontWeight: font.weightSemibold,
          color: colors.textSecondary,
        }}
      >
        {formatPeriodLabel(period)}
      </h3>
      {periodEntries.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          {periodEntries.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              busy={busy}
              onBusy={onBusy}
              onChanged={onChanged}
              onError={onError}
              onClearError={onClearError}
            />
          ))}
        </div>
      ) : (
        <Button
          theme={theme}
          size="sm"
          variant="ghost"
          disabled={busy || previousEntries.length === 0}
          title={previousEntries.length === 0 ? 'Нет данных за прошлый период' : undefined}
          onClick={() => void handleCopyFromPrevious()}
          style={{ alignSelf: 'flex-start' }}
        >
          Из прошлого периода
        </Button>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 56px 72px auto',
          gap: spacing.xs,
          alignItems: 'center',
        }}
      >
        <Input
          theme={theme}
          list={datalistId}
          placeholder="Имя"
          value={addName}
          disabled={busy}
          onChange={(event) => handleNameChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleAdd();
          }}
          style={{ padding: '4px 8px', fontSize: font.sizeXs }}
        />
        <datalist id={datalistId}>
          {nameSuggestions.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
        <Input
          theme={theme}
          type="number"
          min={0}
          step="any"
          placeholder="ч"
          value={addHours}
          disabled={busy}
          onChange={(event) => {
            onClearError();
            setAddHours(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleAdd();
          }}
          style={{ width: 56, padding: '4px 6px', fontSize: font.sizeXs }}
        />
        <Input
          theme={theme}
          type="number"
          min={0}
          step="any"
          placeholder="₽/ч"
          value={addRate}
          disabled={busy}
          onChange={(event) => {
            onClearError();
            setRateTouched(true);
            setAddRate(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void handleAdd();
          }}
          style={{ width: 72, padding: '4px 6px', fontSize: font.sizeXs }}
        />
        <Button
          theme={theme}
          size="sm"
          variant="secondary"
          disabled={busy || !addName.trim()}
          onClick={() => void handleAdd()}
        >
          Добавить
        </Button>
      </div>
    </section>
  );
};

type HalfDistributeBlockProps = {
  halfUi: HalfDistributeUi;
  monthMode: boolean;
  busy: boolean;
  confirmingHalf: OkleykaHalf | null;
  onConfirmStart: (half: OkleykaHalf) => void;
  onConfirmCancel: () => void;
  onDistributeHalf: (half: OkleykaHalf) => void;
};

const HalfDistributeBlock = ({
  halfUi,
  monthMode,
  busy,
  confirmingHalf,
  onConfirmStart,
  onConfirmCancel,
  onDistributeHalf,
}: HalfDistributeBlockProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const remainderColor =
    halfUi.fund.remainderRub < 0 ? colors.danger : (colors.success ?? colors.text);
  const isConfirming = confirmingHalf === halfUi.half;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.xs,
        paddingTop: spacing.xs,
        borderTop: `1px solid ${colors.borderSubtle}`,
      }}
    >
      <div
        style={{
          fontVariantNumeric: 'tabular-nums',
          fontSize: font.sizeXs,
          color: colors.textSecondary,
          display: 'flex',
          flexWrap: 'wrap',
          gap: spacing.xs,
        }}
      >
        <span>
          Фонд{' '}
          <strong style={{ color: colors.text }}>{formatSalaryRub(halfUi.fund.fundRub)}</strong>
        </span>
        <span>·</span>
        <span>
          Раскидано{' '}
          <strong style={{ color: colors.text }}>{formatSalaryRub(halfUi.fund.spentRub)}</strong>
        </span>
        <span>·</span>
        <span>
          Остаток{' '}
          <strong style={{ color: remainderColor }}>
            {formatSalaryRub(halfUi.fund.remainderRub)}
          </strong>
        </span>
      </div>
      {isConfirming && halfUi.disabledReason === null ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          <span style={{ color: colors.textSecondary, fontSize: font.sizeXs }}>
            Раскидать {formatSalaryRub(halfUi.distributionTotalRub)} по {halfUi.distributionCount}{' '}
            сделкам?
          </span>
          <div style={{ display: 'flex', gap: spacing.xs }}>
            <Button
              theme={theme}
              size="sm"
              variant="primary"
              disabled={busy}
              onClick={() => onDistributeHalf(halfUi.half)}
            >
              Да, распределить
            </Button>
            <Button theme={theme} size="sm" variant="ghost" onClick={onConfirmCancel}>
              Отмена
            </Button>
          </div>
        </div>
      ) : (
        <Button
          theme={theme}
          size="sm"
          variant="primary"
          disabled={busy || halfUi.disabledReason !== null}
          onClick={() => onConfirmStart(halfUi.half)}
        >
          {distributeButtonLabel(halfUi.half, monthMode)}
        </Button>
      )}
      {halfUi.disabledReason ? (
        <span style={{ color: colors.textMuted, fontSize: font.sizeXs }}>
          {halfUi.disabledReason}
        </span>
      ) : null}
    </div>
  );
};

export const SalaryPanel = ({
  periods,
  entries,
  historyEntries,
  isLoading,
  onChanged,
  distributeRule,
  onDistributeRuleChange,
  halfDistribute,
  onDistributeHalf,
}: SalaryPanelProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingHalf, setConfirmingHalf] = useState<OkleykaHalf | null>(null);

  const clearError = () => setError(null);
  const setMutationError = (message: string) => setError(message);

  const nameSuggestions = useMemo(
    () => [...new Set(historyEntries.map((e) => e.name).filter(Boolean))],
    [historyEntries],
  );

  const monthMode = halfDistribute.length === 2;

  const cardStyle = {
    backgroundColor: colors.bgSecondary,
    borderRadius: radius.lg,
    boxShadow: `inset 0 0 0 1px ${colors.borderSubtle}`,
    padding: spacing.md,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: spacing.md,
    fontSize: font.sizeSm,
  };

  if (periods.length === 0) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: colors.textMuted, fontSize: font.sizeSm }}>
          Выберите месяц или полупериод, чтобы работать с фондом ЗП
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      {error ? (
        <div style={{ color: colors.danger, fontSize: font.sizeXs }}>{error}</div>
      ) : null}
      {isLoading ? (
        <span style={{ color: colors.textMuted, fontSize: font.sizeXs }}>загрузка…</span>
      ) : null}
      {periods.map((period) => {
        const half = entryHalf(period.dateFrom);
        const halfUi = halfDistribute.find((row) => row.half === half);
        const periodEntries = entries
          .filter((e) => entryHalf(e.periodStart) === half)
          .sort((a, b) => a.name.localeCompare(b.name, 'ru'));
        const sameMonthPreviousEntries =
          half === 'second'
            ? entries.filter((e) => entryHalf(e.periodStart) === 'first')
            : [];
        return (
          <div
            key={`${period.dateFrom}_${period.dateTo}`}
            style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}
          >
            <PeriodSection
              period={period}
              periodEntries={periodEntries}
              historyEntries={historyEntries}
              sameMonthPreviousEntries={sameMonthPreviousEntries}
              nameSuggestions={nameSuggestions}
              busy={busy}
              onBusy={setBusy}
              onChanged={onChanged}
              onError={setMutationError}
              onClearError={clearError}
            />
            {halfUi ? (
              <HalfDistributeBlock
                halfUi={halfUi}
                monthMode={monthMode}
                busy={busy}
                confirmingHalf={confirmingHalf}
                onConfirmStart={setConfirmingHalf}
                onConfirmCancel={() => setConfirmingHalf(null)}
                onDistributeHalf={(targetHalf) => {
                  setConfirmingHalf(null);
                  onDistributeHalf(targetHalf);
                }}
              />
            ) : null}
          </div>
        );
      })}
      {halfDistribute.length > 0 ? (
        <footer
          style={{
            borderTop: `1px solid ${colors.borderSubtle}`,
            paddingTop: spacing.sm,
            display: 'flex',
            flexWrap: 'wrap',
            gap: spacing.xs,
          }}
        >
          {DISTRIBUTE_RULES.map((rule) => (
            <Button
              key={rule.key}
              theme={theme}
              size="sm"
              variant={distributeRule === rule.key ? 'secondary' : 'ghost'}
              title={rule.hint}
              onClick={() => {
                setConfirmingHalf(null);
                onDistributeRuleChange(rule.key);
              }}
            >
              {rule.label}
            </Button>
          ))}
        </footer>
      ) : null}
    </div>
  );
};
