import { useState, type PointerEvent as ReactPointerEvent } from 'react';

import { resolvePrevyuFileUrls } from '../api/files-field';
import { useTheme } from '../theme/ThemeContext';
import type { ThemeTokens } from '../theme/tokens';
import {
  placeProductionBoard,
  productionDateKey,
  productionTimeKey,
  PRODUCTION_COLUMNS,
  type ProductionCard,
  type ProductionColumnId,
} from './board';

const DRAG_THRESHOLD_PX = 6;

const taskCountLabel = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} задача`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} задачи`;
  return `${count} задач`;
};

const COLUMN_IDS = new Set<ProductionColumnId>(['ne-vzyato', 'v-rabote', 'gotovo']);

const ellipsis = {
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
} as const;

const formatReady = (date: string | null, time: string | null): string | null => {
  const day = productionDateKey(date);
  const clock = productionTimeKey(time);
  if (!day && !clock) return null;
  const dayLabel = day
    ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' })
        .format(new Date(`${day}T12:00:00`))
        .replace('.', '')
    : '';
  return [dayLabel, clock].filter(Boolean).join(' · ');
};

const columnFromPoint = (x: number, y: number): ProductionColumnId | null => {
  if (typeof document === 'undefined' || typeof document.elementFromPoint !== 'function') {
    return null;
  }
  const node = document.elementFromPoint(x, y);
  const column = node instanceof Element ? node.closest('[data-production-column]') : null;
  const id = column?.getAttribute('data-production-column');
  return id && COLUMN_IDS.has(id as ProductionColumnId) ? (id as ProductionColumnId) : null;
};

const isInteractiveTarget = (target: EventTarget | null): boolean =>
  target instanceof Element && Boolean(target.closest('button, a, input, textarea, select'));

const cueColor = (theme: ThemeTokens, column: ProductionColumnId): string => {
  if (column === 'gotovo') return theme.colors.success;
  if (column === 'v-rabote') return theme.colors.warning;
  return theme.colors.textMuted;
};

const ProductionCardPhotos = ({ files }: { files: ProductionCard['files'] }) => {
  const { colors, radius } = useTheme();
  const urls = resolvePrevyuFileUrls(files);
  if (!urls.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {urls.map((url) => (
        <img
          key={url}
          src={url}
          alt=""
          style={{
            width: 72,
            height: 72,
            objectFit: 'cover',
            borderRadius: radius.sm,
            border: `1px solid ${colors.borderSubtle}`,
            display: 'block',
          }}
        />
      ))}
    </div>
  );
};

const StatusPill = ({
  label,
  on,
  tone,
}: {
  label: string;
  on: boolean;
  tone: 'vzato' | 'gotovo';
}) => {
  const { colors, font, radius } = useTheme();
  const active =
    tone === 'gotovo'
      ? { background: colors.successMuted, color: colors.success, border: colors.success }
      : { background: colors.warningMuted, color: colors.warning, border: colors.warning };
  return (
    <span
      style={{
        padding: '3px 8px',
        borderRadius: radius.pill,
        border: `1px solid ${on ? active.border : colors.borderSubtle}`,
        background: on ? active.background : colors.bgInset,
        color: on ? active.color : colors.textMuted,
        fontSize: font.sizeXs,
        fontWeight: font.weightMedium,
      }}
    >
      {label}
    </span>
  );
};

export const ProductionBoard = ({
  cards,
  loading,
  error,
  onMove,
}: {
  cards: ProductionCard[];
  loading: boolean;
  error: string | null;
  onMove: (card: ProductionCard, column: ProductionColumnId) => void;
}) => {
  const theme = useTheme();
  const { colors, spacing, font, radius } = theme;
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ProductionColumnId | null>(null);
  const columns = placeProductionBoard(cards);

  const beginPointerDrag = (event: ReactPointerEvent<HTMLElement>, card: ProductionCard) => {
    if (event.button !== 0 || isInteractiveTarget(event.target)) return;
    const pointerId = event.pointerId;
    const startX = event.clientX;
    const startY = event.clientY;
    let moved = false;
    try {
      event.currentTarget.setPointerCapture(pointerId);
    } catch {
      // Capture is optional; window listeners still follow the pointer.
    }

    const finish = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      const target = moved ? columnFromPoint(ev.clientX, ev.clientY) : null;
      setDraggingId(null);
      setOverColumn(null);
      if (target) {
        onMove(card, target);
        return;
      }
      if (!moved) {
        setExpandedId((current) => (current === card.id ? null : card.id));
      }
    };

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pointerId) return;
      if (!moved && Math.hypot(ev.clientX - startX, ev.clientY - startY) < DRAG_THRESHOLD_PX) {
        return;
      }
      moved = true;
      ev.preventDefault();
      setDraggingId(card.id);
      setOverColumn(columnFromPoint(ev.clientX, ev.clientY));
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
  };

  return (
    <div
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
        padding: spacing.md,
        boxSizing: 'border-box',
        fontFamily: font.family,
        color: colors.text,
        background: colors.bg,
        WebkitFontSmoothing: 'antialiased',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm }}>
        <div style={{ fontSize: font.sizeLg, fontWeight: font.weightSemibold, letterSpacing: '-0.02em' }}>
          Производство
        </div>
        <div style={{ fontSize: font.sizeSm, color: colors.textMuted, fontVariantNumeric: 'tabular-nums' }}>
          {loading ? 'Загрузка' : taskCountLabel(cards.length)}
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            padding: `${spacing.sm} ${spacing.md}`,
            borderRadius: radius.md,
            background: colors.dangerMuted,
            color: colors.danger,
            fontSize: font.sizeSm,
            fontWeight: font.weightMedium,
          }}
        >
          {error}
        </div>
      ) : null}

      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))',
          gap: spacing.md,
          userSelect: draggingId ? 'none' : undefined,
        }}
      >
        {PRODUCTION_COLUMNS.map((column) => {
          const items = columns[column.id];
          const armed = overColumn === column.id && draggingId !== null;
          return (
            <section
              key={column.id}
              aria-label={column.title}
              data-production-column={column.id}
              style={{
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                borderRadius: radius.lg,
                background: armed ? colors.accentMuted : colors.bgSecondary,
                boxShadow: armed ? `inset 0 0 0 1px ${colors.accent}` : colors.shadow,
                overflow: 'hidden',
              }}
            >
              <header
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.md} ${spacing.md} ${spacing.sm}`,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: radius.pill,
                    background: cueColor(theme, column.id),
                    flexShrink: 0,
                  }}
                />
                <h2
                  style={{
                    margin: 0,
                    flex: 1,
                    fontSize: font.sizeSm,
                    fontWeight: font.weightSemibold,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {column.title}
                </h2>
                <span
                  style={{
                    minWidth: 22,
                    padding: '1px 7px',
                    borderRadius: radius.pill,
                    background: colors.bgHover,
                    color: colors.textSecondary,
                    fontSize: font.sizeXs,
                    fontWeight: font.weightMedium,
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {items.length}
                </span>
              </header>
              <div
                style={{
                  flex: 1,
                  minHeight: 0,
                  overflow: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: spacing.sm,
                  padding: `0 ${spacing.sm} ${spacing.sm}`,
                }}
              >
                {!loading && items.length === 0 ? (
                  <div
                    style={{
                      margin: 'auto',
                      padding: spacing.lg,
                      color: colors.textMuted,
                      fontSize: font.sizeSm,
                      textAlign: 'center',
                    }}
                  >
                    Нет задач
                  </div>
                ) : null}
                {items.map((card) => {
                  const ready = formatReady(card.date, card.time);
                  const expanded = expandedId === card.id;
                  const dragging = draggingId === card.id;
                  return (
                    <article
                      key={card.id}
                      onPointerDown={(event) => beginPointerDrag(event, card)}
                      style={{
                        padding: spacing.md,
                        borderRadius: radius.md,
                        background: colors.bgElevated,
                        border: `1px solid ${expanded ? colors.borderStrong : colors.borderSubtle}`,
                        boxShadow: colors.shadow,
                        cursor: dragging ? 'grabbing' : 'grab',
                        opacity: dragging ? 0.45 : 1,
                        touchAction: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4,
                        minWidth: 0,
                      }}
                    >
                      <div
                        style={{
                          ...ellipsis,
                          fontSize: font.sizeMd,
                          fontWeight: font.weightSemibold,
                          letterSpacing: '-0.015em',
                        }}
                      >
                        {card.name}
                      </div>
                      {card.dealName ? (
                        <div style={{ ...ellipsis, fontSize: font.sizeSm, color: colors.textSecondary }}>
                          {card.dealName}
                        </div>
                      ) : null}
                      {ready ? (
                        <div
                          style={{
                            fontSize: font.sizeXs,
                            color: colors.textMuted,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {ready}
                        </div>
                      ) : null}
                      {expanded ? (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: spacing.sm,
                            marginTop: spacing.sm,
                            paddingTop: spacing.sm,
                            borderTop: `1px solid ${colors.borderSubtle}`,
                          }}
                        >
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                            <StatusPill label="Взято" on={card.vzato} tone="vzato" />
                            <StatusPill label="Готово" on={card.gotovo} tone="gotovo" />
                          </div>
                          {card.comment ? (
                            <p
                              style={{
                                margin: 0,
                                fontSize: font.sizeSm,
                                color: colors.textSecondary,
                                whiteSpace: 'pre-wrap',
                              }}
                            >
                              {card.comment}
                            </p>
                          ) : null}
                          <ProductionCardPhotos files={card.files} />
                          <button
                            type="button"
                            onClick={() => setExpandedId(null)}
                            style={{
                              alignSelf: 'flex-start',
                              padding: 0,
                              border: 'none',
                              background: 'transparent',
                              color: colors.accentText,
                              font: 'inherit',
                              fontSize: font.sizeSm,
                              fontWeight: font.weightMedium,
                              cursor: 'pointer',
                            }}
                          >
                            Свернуть
                          </button>
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
};
