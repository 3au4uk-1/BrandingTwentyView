import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { BANNER_CREW_LOCATION_LABEL } from 'src/constants/banner-crew';

import { useSuppliers } from '../hooks/useSuppliers';
import type { SupplierRow } from '../suppliers/picker';
import { ThemeProvider, useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { BannerCrewModal } from './BannerCrewModal';
import { ganttBarRect } from './gantt-layout';
import { getMskWeekRange, shiftMskWeek, type MskWeekRange } from './msk-datetime';
import { findConflicts, isOccupyingSlot } from './occupancy';
import type { BannerCrewSlot } from './types';
import { useBannerCrewSlots } from './useBannerCrewSlots';

const SITE_BAR = 'rgba(52, 199, 89, 0.35)';
const BASE_BAR = 'rgba(120, 120, 128, 0.35)';
const NAME_COL_WIDTH = 148;
const ROW_HEIGHT = 34;
const BAR_HEIGHT = 18;
const BAR_TOP = 8;
const TRACK_MIN_WIDTH = 420;
const BANNERA_CATEGORY = 'BANNERA';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const mskNoon = (date: string): Date => new Date(`${date}T12:00:00+03:00`);

const formatWeekLabel = (days: string[]): string => {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return '';
  const start = mskNoon(first);
  const end = mskNoon(last);
  const dayFmt = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    timeZone: 'Europe/Moscow',
  });
  const monthFmt = new Intl.DateTimeFormat('ru-RU', {
    month: 'short',
    timeZone: 'Europe/Moscow',
  });
  const startDay = dayFmt.format(start);
  const endDay = dayFmt.format(end);
  const startMonth = monthFmt.format(start).replace(/\./g, '').trim();
  const endMonth = monthFmt.format(end).replace(/\./g, '').trim();
  if (startMonth === endMonth) return `${startDay}–${endDay} ${endMonth}`;
  return `${startDay} ${startMonth}–${endDay} ${endMonth}`;
};

const formatDayLabel = (date: string): string => {
  const instant = mskNoon(date);
  const weekday = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    timeZone: 'Europe/Moscow',
  })
    .format(instant)
    .replace(/\./g, '');
  const day = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    timeZone: 'Europe/Moscow',
  }).format(instant);
  return `${weekday} ${day}`;
};

const barColor = (
  slot: BannerCrewSlot,
  conflictIds: Set<string>,
  warning: string,
): string => {
  if (conflictIds.has(slot.id)) return warning;
  return slot.location === 'SITE' ? SITE_BAR : BASE_BAR;
};

const occupyingInWeek = (
  slots: BannerCrewSlot[],
  week: MskWeekRange,
): BannerCrewSlot[] =>
  slots.filter((slot) => {
    if (!isOccupyingSlot(slot) || !slot.startsAt || !slot.endsAt) return false;
    return ganttBarRect(slot.startsAt, slot.endsAt, week.startIso, week.endIso) !== null;
  });

const ganttRows = (
  suppliers: SupplierRow[],
  weekSlots: BannerCrewSlot[],
): SupplierRow[] => {
  const weekSupplierIds = new Set(
    weekSlots.map((slot) => slot.supplierId).filter((id): id is string => Boolean(id)),
  );
  return suppliers
    .filter(
      (supplier) =>
        supplier.category === BANNERA_CATEGORY &&
        (supplier.isActive || weekSupplierIds.has(supplier.id)),
    )
    .sort((left, right) => left.name.localeCompare(right.name, 'ru'));
};

type OpenDeal = {
  opportunityId: string;
  opportunityName: string;
};

const BannerCrewGanttPageInner = () => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const [week, setWeek] = useState(() => getMskWeekRange(new Date()));
  const [openDeal, setOpenDeal] = useState<OpenDeal | null>(null);
  const slotsQuery = useBannerCrewSlots();
  const suppliersQuery = useSuppliers();

  const slots = slotsQuery.data ?? [];
  const occupying = useMemo(() => slots.filter(isOccupyingSlot), [slots]);
  const conflictIds = useMemo(() => {
    const map = findConflicts(occupying);
    return new Set(map.keys());
  }, [occupying]);
  const weekSlots = useMemo(() => occupyingInWeek(occupying, week), [occupying, week]);
  const rows = useMemo(
    () => ganttRows(suppliersQuery.data ?? [], weekSlots),
    [suppliersQuery.data, weekSlots],
  );

  const weekLabel = formatWeekLabel(week.days);

  return (
    <div
      data-banner-crew-gantt
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
        overflow: 'hidden',
      }}
    >
      <header
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.md,
          flexShrink: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: font.sizeLg,
            fontWeight: font.weightSemibold,
            letterSpacing: '-0.02em',
          }}
        >
          Баннерщики
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
          <Button
            theme={theme}
            size="sm"
            variant="ghost"
            aria-label="Предыдущая неделя"
            onClick={() => setWeek((current) => shiftMskWeek(current, -1))}
          >
            ←
          </Button>
          <span
            style={{
              fontSize: font.sizeMd,
              fontWeight: font.weightMedium,
              color: colors.textSecondary,
              minWidth: 108,
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {weekLabel}
          </span>
          <Button
            theme={theme}
            size="sm"
            variant="ghost"
            aria-label="Следующая неделя"
            onClick={() => setWeek((current) => shiftMskWeek(current, 1))}
          >
            →
          </Button>
        </div>
      </header>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'auto',
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: radius.md,
          backgroundColor: colors.bgElevated,
        }}
      >
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 2,
            display: 'flex',
            minWidth: NAME_COL_WIDTH + TRACK_MIN_WIDTH,
            backgroundColor: colors.bgElevated,
            borderBottom: `1px solid ${colors.borderSubtle}`,
          }}
        >
          <div
            style={{
              width: NAME_COL_WIDTH,
              flexShrink: 0,
              position: 'sticky',
              left: 0,
              zIndex: 3,
              backgroundColor: colors.bgElevated,
              borderRight: `1px solid ${colors.borderSubtle}`,
            }}
          />
          <div style={{ flex: 1, display: 'flex', minWidth: TRACK_MIN_WIDTH }}>
            {week.days.map((day) => (
              <div
                key={day}
                style={{
                  flex: 1,
                  padding: `${spacing.xs} ${spacing.sm}`,
                  fontSize: font.sizeXs,
                  fontWeight: font.weightMedium,
                  color: colors.textMuted,
                  textAlign: 'center',
                }}
              >
                {formatDayLabel(day)}
              </div>
            ))}
          </div>
        </div>

        {rows.map((supplier) => {
          const bars = weekSlots.filter((slot) => slot.supplierId === supplier.id);
          return (
            <div
              key={supplier.id}
              style={{
                display: 'flex',
                minWidth: NAME_COL_WIDTH + TRACK_MIN_WIDTH,
                height: ROW_HEIGHT,
                borderBottom: `1px solid ${colors.borderSubtle}`,
              }}
            >
              <div
                style={{
                  width: NAME_COL_WIDTH,
                  flexShrink: 0,
                  position: 'sticky',
                  left: 0,
                  zIndex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.xs,
                  padding: `0 ${spacing.sm}`,
                  backgroundColor: colors.bgElevated,
                  borderRight: `1px solid ${colors.borderSubtle}`,
                  overflow: 'hidden',
                }}
              >
                <span
                  title={supplier.name}
                  style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontSize: font.sizeSm,
                    fontWeight: font.weightMedium,
                    color: supplier.isActive ? colors.text : colors.textMuted,
                  }}
                >
                  {supplier.name}
                </span>
                {supplier.isActive ? null : (
                  <span style={{ fontSize: font.sizeXs, color: colors.textMuted, flexShrink: 0 }}>
                    неактивен
                  </span>
                )}
              </div>
              <div
                style={{
                  flex: 1,
                  position: 'relative',
                  minWidth: TRACK_MIN_WIDTH,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    pointerEvents: 'none',
                  }}
                >
                  {week.days.map((day) => (
                    <div
                      key={day}
                      style={{
                        flex: 1,
                        borderRight: `1px solid ${colors.borderSubtle}`,
                      }}
                    />
                  ))}
                </div>
                {bars.map((slot) => {
                  const rect = ganttBarRect(
                    slot.startsAt!,
                    slot.endsAt!,
                    week.startIso,
                    week.endIso,
                  );
                  if (!rect || !slot.opportunityId) return null;
                  const label = `${slot.opportunityName ?? ''} · ${BANNER_CREW_LOCATION_LABEL[slot.location]}`;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      title={label}
                      aria-label={label}
                      onClick={() =>
                        setOpenDeal({
                          opportunityId: slot.opportunityId!,
                          opportunityName: slot.opportunityName ?? '',
                        })
                      }
                      style={{
                        position: 'absolute',
                        height: BAR_HEIGHT,
                        top: BAR_TOP,
                        left: `${rect.leftPct}%`,
                        width: `${rect.widthPct}%`,
                        borderRadius: radius.sm,
                        backgroundColor: barColor(slot, conflictIds, colors.warning),
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {openDeal ? (
        <BannerCrewModal
          opportunityId={openDeal.opportunityId}
          opportunityName={openDeal.opportunityName}
          loadDate={null}
          isOpen
          onClose={() => setOpenDeal(null)}
        />
      ) : null}
    </div>
  );
};

export const BannerCrewGanttPage = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BannerCrewGanttPageInner />
    </ThemeProvider>
  </QueryClientProvider>
);
