import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from 'react';

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
import { isProductionInteractiveTarget, type PointerNode } from './production-pointer';
import { ProductionPhotoLightbox } from './ProductionPhotoLightbox';

const DRAG_THRESHOLD_PX = 6;

const taskCountLabel = (count: number): string => {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} задача`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} задачи`;
  return `${count} задач`;
};

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

const cueColor = (theme: ThemeTokens, column: ProductionColumnId): string => {
  if (column === 'gotovo') return theme.colors.success;
  if (column === 'v-rabote') return theme.colors.warning;
  return theme.colors.textMuted;
};

const ProductionCardPhotos = ({
  files,
  onOpen,
}: {
  files: ProductionCard['files'];
  onOpen: (url: string) => void;
}) => {
  const { colors, radius } = useTheme();
  const urls = resolvePrevyuFileUrls(files);
  if (!urls.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {urls.map((url) => (
        <button
          key={url}
          type="button"
          aria-label="Открыть фото"
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => {
            event.stopPropagation();
            onOpen(url);
          }}
          style={{
            padding: 0,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: radius.sm,
            background: colors.bgInset,
            cursor: 'pointer',
            lineHeight: 0,
          }}
        >
          <img
            src={url}
            alt=""
            draggable={false}
            style={{
              width: 72,
              height: 72,
              objectFit: 'cover',
              borderRadius: radius.sm,
              display: 'block',
            }}
          />
        </button>
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
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ProductionColumnId | null>(null);
  const dragRef = useRef<{
    card: ProductionCard;
    pointerId: number | null;
    startX: number;
    startY: number;
    moved: boolean;
  } | null>(null);
  const overRef = useRef<ProductionColumnId | null>(null);
  const detachRef = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const columns = placeProductionBoard(cards);

  const setOver = (id: ProductionColumnId | null) => {
    overRef.current = id;
    setOverColumn(id);
  };

  const detachDrag = () => {
    detachRef.current?.();
    detachRef.current = null;
  };

  const noteMove = (clientX: number, clientY: number, pointerId?: number) => {
    const session = dragRef.current;
    if (!session) return;
    if (session.pointerId !== null && pointerId != null && pointerId !== session.pointerId) return;
    if (Math.hypot(clientX - session.startX, clientY - session.startY) < DRAG_THRESHOLD_PX) return;
    session.moved = true;
    setDraggingId(session.card.id);
  };

  const finishDrag = (clientX: number, clientY: number) => {
    const session = dragRef.current;
    if (!session) return;
    const moved =
      session.moved ||
      Math.hypot(clientX - session.startX, clientY - session.startY) >= DRAG_THRESHOLD_PX;
    const target = moved ? overRef.current : null;
    dragRef.current = null;
    detachDrag();
    setDraggingId(null);
    setOver(null);
    if (moved) suppressClick.current = true;
    if (target) onMove(session.card, target);
  };

  const beginDrag = (event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>, card: ProductionCard) => {
    if (event.button != null && event.button !== 0) return;
    if (isProductionInteractiveTarget(event.target as PointerNode | null)) return;
    detachDrag();
    const pointerId = 'pointerId' in event ? event.pointerId : null;
    dragRef.current = {
      card,
      pointerId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };

    // Twenty sandbox: setPointerCapture is often missing, and `window` does not
    // receive the later move or release. Listen on the owner document instead.
    const doc = event.currentTarget.ownerDocument;
    const view = doc.defaultView;
    const onPointerMove = (moveEvent: PointerEvent) => {
      noteMove(moveEvent.clientX, moveEvent.clientY, moveEvent.pointerId);
    };
    const onMouseMove = (moveEvent: MouseEvent) => {
      noteMove(moveEvent.clientX, moveEvent.clientY);
    };
    const onUp = (upEvent: PointerEvent | MouseEvent) => {
      finishDrag(upEvent.clientX, upEvent.clientY);
    };
    const onCancel = () => {
      dragRef.current = null;
      detachDrag();
      setDraggingId(null);
      setOver(null);
    };

    doc.addEventListener('pointermove', onPointerMove, true);
    doc.addEventListener('mousemove', onMouseMove, true);
    doc.addEventListener('pointerup', onUp, true);
    doc.addEventListener('mouseup', onUp, true);
    doc.addEventListener('pointercancel', onCancel, true);
    view?.addEventListener('pointermove', onPointerMove, true);
    view?.addEventListener('mousemove', onMouseMove, true);
    view?.addEventListener('pointerup', onUp, true);
    view?.addEventListener('mouseup', onUp, true);
    view?.addEventListener('pointercancel', onCancel, true);

    detachRef.current = () => {
      doc.removeEventListener('pointermove', onPointerMove, true);
      doc.removeEventListener('mousemove', onMouseMove, true);
      doc.removeEventListener('pointerup', onUp, true);
      doc.removeEventListener('mouseup', onUp, true);
      doc.removeEventListener('pointercancel', onCancel, true);
      view?.removeEventListener('pointermove', onPointerMove, true);
      view?.removeEventListener('mousemove', onMouseMove, true);
      view?.removeEventListener('pointerup', onUp, true);
      view?.removeEventListener('mouseup', onUp, true);
      view?.removeEventListener('pointercancel', onCancel, true);
    };
  };

  const armColumn = (
    columnId: ProductionColumnId,
    event: ReactPointerEvent<HTMLElement> | ReactMouseEvent<HTMLElement>,
  ) => {
    noteMove(event.clientX, event.clientY, 'pointerId' in event ? event.pointerId : undefined);
    if (dragRef.current?.moved) setOver(columnId);
  };

  useEffect(() => detachDrag, []);

  return (
    <div
      onPointerMove={(event) => noteMove(event.clientX, event.clientY, event.pointerId)}
      onMouseMove={(event) => noteMove(event.clientX, event.clientY)}
      onPointerUp={(event) => finishDrag(event.clientX, event.clientY)}
      onMouseUp={(event) => finishDrag(event.clientX, event.clientY)}
      style={{
        height: '100%',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md,
        padding: spacing.md,
        boxSizing: 'border-box',
        position: 'relative',
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
              onPointerEnter={() => {
                if (dragRef.current) setOver(column.id);
              }}
              onMouseEnter={() => {
                if (dragRef.current) setOver(column.id);
              }}
              onPointerMove={(event) => armColumn(column.id, event)}
              onMouseMove={(event) => armColumn(column.id, event)}
              onPointerUp={(event) => finishDrag(event.clientX, event.clientY)}
              onMouseUp={(event) => finishDrag(event.clientX, event.clientY)}
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
                      onPointerDown={(event) => beginDrag(event, card)}
                      onMouseDown={(event) => beginDrag(event, card)}
                      onPointerUp={(event) => finishDrag(event.clientX, event.clientY)}
                      onMouseUp={(event) => finishDrag(event.clientX, event.clientY)}
                      onClick={() => {
                        if (suppressClick.current) {
                          suppressClick.current = false;
                          return;
                        }
                        setExpandedId((current) => (current === card.id ? null : card.id));
                      }}
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
                          <ProductionCardPhotos files={card.files} onOpen={setPhotoUrl} />
                          <button
                            type="button"
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedId(null);
                            }}
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
      {photoUrl ? (
        <ProductionPhotoLightbox url={photoUrl} onClose={() => setPhotoUrl(null)} />
      ) : null}
    </div>
  );
};
