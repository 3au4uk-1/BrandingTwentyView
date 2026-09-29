import { useState, type KeyboardEvent, type MouseEvent } from 'react';

import { useTheme } from '../theme/ThemeContext';
import type { ThemeTokens } from '../theme/tokens';
import { Button } from '../ui/Button';
import type { BannerCalendarModel, BannerDayCard } from './calendar-layout';
import { buildMonthGrid, visibleWeekDays, type CalendarView } from './calendar-nav';
import { mskToday } from './msk-datetime';

type BannerCrewCalendarProps = {
  model: BannerCalendarModel;
  view: CalendarView;
  error: boolean;
  loading: boolean;
  onShift: (delta: number) => void;
  onToday: () => void;
  onToggleMode: () => void;
  onSelectDate: (date: string) => void;
  onOpenDeal: (dealId: string, name: string) => void;
  onShowGantt: () => void;
};

const MSK_TZ = 'Europe/Moscow';
const WEEKDAY_HEADERS = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс'];
const MONTH_ROWS_PER_CELL = 4;
const DAY_COL_MIN_WIDTH = 120;

const mskNoon = (date: string): Date => new Date(`${date}T12:00:00+03:00`);

const formatDayLabel = (date: string): string => {
  const instant = mskNoon(date);
  const weekday = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'short',
    timeZone: MSK_TZ,
  })
    .format(instant)
    .replace(/\./g, '');
  const day = new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    timeZone: MSK_TZ,
  }).format(instant);
  return `${weekday} ${day}`;
};

const formatWeekLabel = (days: string[]): string => {
  const first = days[0];
  const last = days[days.length - 1];
  if (!first || !last) return '';
  const dayFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', timeZone: MSK_TZ });
  const monthFmt = new Intl.DateTimeFormat('ru-RU', { month: 'short', timeZone: MSK_TZ });
  const startDay = dayFmt.format(mskNoon(first));
  const endDay = dayFmt.format(mskNoon(last));
  const startMonth = monthFmt.format(mskNoon(first)).replace(/\./g, '').trim();
  const endMonth = monthFmt.format(mskNoon(last)).replace(/\./g, '').trim();
  if (startMonth === endMonth) return `${startDay}–${endDay} ${endMonth}`;
  return `${startDay} ${startMonth}–${endDay} ${endMonth}`;
};

const formatMonthLabel = (year: number, month: number): string => {
  const first = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-01`;
  const label = new Intl.DateTimeFormat('ru-RU', { month: 'long', timeZone: MSK_TZ }).format(
    mskNoon(first),
  );
  return `${label} ${year}`;
};

const cardKey = (card: BannerDayCard): string => `${card.dealId}|${card.date}`;

const cardTitle = (card: BannerDayCard): string =>
  [card.timeLabel, card.address, card.assignees.join(', '), card.positionNames.join(', ')]
    .filter(Boolean)
    .join(' · ');

const ellipsis = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

type DayCardProps = {
  card: BannerDayCard;
  theme: ThemeTokens;
  hovered: boolean;
  onHover: (key: string | null) => void;
  onClick: () => void;
};

const DayCard = ({ card, theme, hovered, onHover, onClick }: DayCardProps) => {
  const { colors, font, spacing, radius } = theme;
  const assignees = card.assignees.join(', ');
  return (
    <button
      type="button"
      data-banner-card
      onClick={onClick}
      onMouseEnter={() => onHover(cardKey(card))}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(cardKey(card))}
      onBlur={() => onHover(null)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 2,
        width: '100%',
        minWidth: 0,
        padding: `${spacing.xs} ${spacing.sm}`,
        textAlign: 'left',
        fontFamily: font.family,
        fontSize: font.sizeXs,
        color: colors.text,
        backgroundColor: hovered ? colors.bgHover : colors.bg,
        border: `1px solid ${colors.borderSubtle}`,
        borderRadius: radius.sm,
        cursor: 'pointer',
        boxSizing: 'border-box',
      }}
    >
      <span style={{ ...ellipsis, fontSize: font.sizeSm, fontWeight: font.weightMedium }}>
        {card.name}
      </span>
      {card.timeLabel ? (
        <span style={{ ...ellipsis, color: colors.textSecondary, fontVariantNumeric: 'tabular-nums' }}>
          {card.timeLabel}
        </span>
      ) : null}
      {card.address ? (
        <span style={{ ...ellipsis, color: colors.textSecondary }}>{card.address}</span>
      ) : null}
      {assignees ? <span style={{ ...ellipsis, color: colors.textMuted }}>{assignees}</span> : null}
      {card.positionNames.length > 0 ? (
        <span
          data-banner-positions
          style={{ color: colors.textMuted, whiteSpace: 'normal', wordBreak: 'break-word' }}
        >
          {hovered ? `позиции: ${card.positionNames.join(', ')}` : 'позиции'}
        </span>
      ) : null}
    </button>
  );
};

export const BannerCrewCalendar = ({
  model,
  view,
  error,
  loading,
  onShift,
  onToday,
  onToggleMode,
  onSelectDate,
  onOpenDeal,
  onShowGantt,
}: BannerCrewCalendarProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const today = mskToday(new Date());

  const weekDays = view.mode === 'week' && view.anchorDate ? visibleWeekDays(view.anchorDate) : [];
  const monthGrid = view.mode === 'month' && view.anchorDate ? buildMonthGrid(view.anchorDate) : null;
  const periodLabel =
    view.mode === 'week'
      ? formatWeekLabel(weekDays)
      : monthGrid
        ? formatMonthLabel(monthGrid.year, monthGrid.month)
        : '';

  const openCard = (card: BannerDayCard) => {
    onOpenDeal(card.dealId, card.name);
    if (card.date) onSelectDate(card.date);
  };

  const openRow = (event: MouseEvent | KeyboardEvent, card: BannerDayCard) => {
    event.stopPropagation();
    onOpenDeal(card.dealId, card.name);
  };

  const panelStyle = {
    flex: 1,
    minHeight: 0,
    border: `1px solid ${colors.borderSubtle}`,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
  } as const;

  const renderBody = () => {
    if (error) {
      return (
        <div
          role="alert"
          style={{
            ...panelStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: font.sizeMd,
            color: colors.danger,
          }}
        >
          Не удалось загрузить календарь
        </div>
      );
    }

    if (loading) {
      return (
        <div
          style={{
            ...panelStyle,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: font.sizeMd,
            color: colors.textMuted,
          }}
        >
          Загрузка
        </div>
      );
    }

    return (
      <>
        {model.undated.length > 0 ? (
          <div
            data-banner-undated
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: spacing.sm,
              flexShrink: 0,
              maxHeight: 132,
              overflowX: 'auto',
              overflowY: 'hidden',
              padding: spacing.sm,
              border: `1px solid ${colors.borderSubtle}`,
              borderRadius: radius.md,
              backgroundColor: colors.bgElevated,
            }}
          >
            <span
              style={{
                flexShrink: 0,
                fontSize: font.sizeXs,
                fontWeight: font.weightMedium,
                color: colors.textMuted,
                paddingTop: spacing.xs,
              }}
            >
              Без даты
            </span>
            {model.undated.map((card) => (
              <div key={cardKey(card)} style={{ flexShrink: 0, width: 180 }}>
                <DayCard
                  card={card}
                  theme={theme}
                  hovered={hoveredKey === cardKey(card)}
                  onHover={setHoveredKey}
                  onClick={() => openCard(card)}
                />
              </div>
            ))}
          </div>
        ) : null}

        {view.mode === 'week' ? (
          <div style={{ ...panelStyle, display: 'flex', overflowX: 'auto', overflowY: 'hidden' }}>
            {weekDays.map((day) => {
              const cards = model.cardsByDate[day] ?? [];
              const isToday = day === today;
              return (
                <div
                  key={day}
                  data-banner-day={day}
                  style={{
                    flex: 1,
                    minWidth: DAY_COL_MIN_WIDTH,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    borderRight: `1px solid ${colors.borderSubtle}`,
                  }}
                >
                  <div
                    style={{
                      flexShrink: 0,
                      padding: `${spacing.xs} ${spacing.sm}`,
                      fontSize: font.sizeXs,
                      fontWeight: font.weightMedium,
                      color: isToday ? colors.accentText : colors.textMuted,
                      textAlign: 'center',
                      borderBottom: `1px solid ${colors.borderSubtle}`,
                    }}
                  >
                    {formatDayLabel(day)}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: spacing.xs,
                      padding: spacing.xs,
                    }}
                  >
                    {cards.map((card) => (
                      <DayCard
                        key={cardKey(card)}
                        card={card}
                        theme={theme}
                        hovered={hoveredKey === cardKey(card)}
                        onHover={setHoveredKey}
                        onClick={() => openCard(card)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ ...panelStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                display: 'flex',
                flexShrink: 0,
                borderBottom: `1px solid ${colors.borderSubtle}`,
              }}
            >
              {WEEKDAY_HEADERS.map((label) => (
                <div
                  key={label}
                  style={{
                    flex: 1,
                    padding: `${spacing.xs} ${spacing.sm}`,
                    fontSize: font.sizeXs,
                    fontWeight: font.weightMedium,
                    color: colors.textMuted,
                    textAlign: 'center',
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexWrap: 'wrap' }}>
              {(monthGrid?.cells ?? []).map((cell) => {
                const cellStyle = {
                  width: `${100 / 7}%`,
                  height: `${100 / Math.max(1, Math.ceil((monthGrid?.cells.length ?? 7) / 7))}%`,
                  minHeight: 0,
                  boxSizing: 'border-box',
                  borderRight: `1px solid ${colors.borderSubtle}`,
                  borderBottom: `1px solid ${colors.borderSubtle}`,
                  overflow: 'hidden',
                } as const;
                if (!cell.inMonth) {
                  return (
                    <div
                      key={cell.date}
                      style={{ ...cellStyle, backgroundColor: colors.bgSecondary }}
                    />
                  );
                }
                const cards = model.cardsByDate[cell.date] ?? [];
                const shown = cards.slice(0, MONTH_ROWS_PER_CELL);
                const hidden = cards.length - shown.length;
                const selected = cell.date === view.anchorDate;
                const isToday = cell.date === today;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    data-banner-month-cell={cell.date}
                    onClick={() => onSelectDate(cell.date)}
                    style={{
                      ...cellStyle,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: 2,
                      padding: spacing.xs,
                      textAlign: 'left',
                      fontFamily: font.family,
                      color: colors.text,
                      backgroundColor: selected ? colors.accentMuted : 'transparent',
                      borderTop: 'none',
                      borderLeft: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{
                        fontSize: font.sizeXs,
                        fontWeight: font.weightMedium,
                        color: isToday ? colors.accentText : colors.textMuted,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {Number(cell.date.slice(8, 10))}
                    </span>
                    {shown.map((card) => (
                      <span
                        key={cardKey(card)}
                        role="button"
                        tabIndex={0}
                        data-banner-card
                        title={cardTitle(card)}
                        onClick={(event) => openRow(event, card)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            openRow(event, card);
                          }
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: spacing.xs,
                          minWidth: 0,
                          padding: '1px 4px',
                          fontSize: font.sizeXs,
                          borderRadius: radius.sm,
                          backgroundColor: colors.bg,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ ...ellipsis, flex: 1, minWidth: 0 }}>{card.name}</span>
                        {card.closed ? (
                          <span
                            aria-hidden
                            style={{
                              flexShrink: 0,
                              width: 6,
                              height: 6,
                              borderRadius: radius.pill,
                              backgroundColor: colors.success,
                            }}
                          />
                        ) : null}
                      </span>
                    ))}
                    {hidden > 0 ? (
                      <span style={{ fontSize: font.sizeXs, color: colors.textMuted }}>
                        ещё {hidden}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div
      data-banner-calendar
      style={{
        position: 'relative',
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
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: spacing.xs }}>
          <Button theme={theme} size="sm" variant="ghost" onClick={onShowGantt}>
            Гант
          </Button>
          <Button theme={theme} size="sm" variant="ghost" onClick={onToday}>
            Сегодня
          </Button>
          <Button
            theme={theme}
            size="sm"
            variant="ghost"
            aria-label={view.mode === 'week' ? 'Предыдущая неделя' : 'Предыдущий месяц'}
            onClick={() => onShift(-1)}
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
            {periodLabel}
          </span>
          <Button
            theme={theme}
            size="sm"
            variant="ghost"
            aria-label={view.mode === 'week' ? 'Следующая неделя' : 'Следующий месяц'}
            onClick={() => onShift(1)}
          >
            →
          </Button>
          <Button
            theme={theme}
            size="sm"
            variant={view.mode === 'week' ? 'primary' : 'ghost'}
            aria-pressed={view.mode === 'week'}
            onClick={view.mode === 'week' ? undefined : onToggleMode}
          >
            Неделя
          </Button>
          <Button
            theme={theme}
            size="sm"
            variant={view.mode === 'month' ? 'primary' : 'ghost'}
            aria-pressed={view.mode === 'month'}
            onClick={view.mode === 'month' ? undefined : onToggleMode}
          >
            Месяц
          </Button>
        </div>
      </header>

      {renderBody()}
    </div>
  );
};
