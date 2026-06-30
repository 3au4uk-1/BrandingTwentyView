import { useMemo, useState } from 'react';

import type { ThemeTokens } from '../theme/tokens';
import { toLocalInputDate } from '../utils/date-filters';
import { Button } from '../ui/Button';

type SimpleDateCalendarProps = {
  theme: ThemeTokens;
  value?: string;
  onSelect: (isoDate: string) => void;
};

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

const pad2 = (value: number) => String(value).padStart(2, '0');

const toIsoDate = (year: number, month: number, day: number) =>
  `${year}-${pad2(month + 1)}-${pad2(day)}`;

const parseIsoDate = (value?: string): Date | null => {
  const inputDate = value ? toLocalInputDate(value) : null;
  if (!inputDate) return null;

  const [year, month, day] = inputDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
};

const MONTH_LABELS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь',
] as const;

export const SimpleDateCalendar = ({ theme, value, onSelect }: SimpleDateCalendarProps) => {
  const { colors, font, spacing, radius } = theme;
  const selectedDate = parseIsoDate(value);
  const [viewDate, setViewDate] = useState(() => selectedDate ?? new Date());

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const cells = useMemo(() => {
    const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const items: Array<{ day: number; iso: string } | null> = [];

    for (let index = 0; index < firstWeekday; index += 1) {
      items.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      items.push({ day, iso: toIsoDate(year, month, day) });
    }

    return items;
  }, [month, year]);

  const shiftMonth = (delta: number) => {
    setViewDate((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1));
  };

  return (
    <div style={{ display: 'grid', gap: spacing.md }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
        }}
      >
        <Button theme={theme} variant="ghost" size="sm" onClick={() => shiftMonth(-1)}>
          ←
        </Button>
        <div style={{ fontSize: font.sizeSm, fontWeight: font.weightSemibold }}>
          {MONTH_LABELS[month]} {year}
        </div>
        <Button theme={theme} variant="ghost" size="sm" onClick={() => shiftMonth(1)}>
          →
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {WEEKDAYS.map((label) => (
          <div
            key={label}
            style={{
              textAlign: 'center',
              fontSize: font.sizeXs,
              color: colors.textMuted,
              fontWeight: font.weightMedium,
              padding: '2px 0',
            }}
          >
            {label}
          </div>
        ))}

        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} />;
          }

          const isSelected = value === cell.iso;
          const isToday = cell.iso === toIsoDate(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

          return (
            <button
              key={cell.iso}
              type="button"
              onClick={() => onSelect(cell.iso)}
              style={{
                border: `1px solid ${isSelected ? colors.accent : 'transparent'}`,
                borderRadius: radius.md,
                backgroundColor: isSelected
                  ? colors.accentMuted
                  : isToday
                    ? colors.bgHover
                    : 'transparent',
                color: isSelected ? colors.accentText : colors.text,
                fontSize: font.sizeSm,
                fontWeight: isSelected ? font.weightSemibold : font.weightMedium,
                padding: '8px 0',
                cursor: 'pointer',
              }}
            >
              {cell.day}
            </button>
          );
        })}
      </div>
    </div>
  );
};
