import { useRef, useState } from 'react';

import { useTheme } from '../theme/ThemeContext';
import {
  placeProductionBoard,
  productionDateKey,
  productionDragPatch,
  productionTimeKey,
  PRODUCTION_COLUMNS,
  type ProductionCard,
  type ProductionColumnId,
} from './board';

const checkText = (label: string, value: boolean) => `${label}: ${value ? 'да' : 'нет'}`;

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
  const { colors, spacing, font } = useTheme();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const dragged = useRef(false);
  const draggingId = useRef<string | null>(null);
  const columns = placeProductionBoard(cards);

  if (loading) return <p>Загрузка</p>;

  return (
    <div style={{ height: '100%', minHeight: 0, display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
      {error ? <p role="alert">{error}</p> : null}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: spacing.sm,
        }}
      >
        {PRODUCTION_COLUMNS.map((column) => (
          <section
            key={column.id}
            aria-label={column.title}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const fromTransfer = event.dataTransfer.getData('text/plain');
              const id = fromTransfer || draggingId.current || '';
              const card = cards.find((item) => item.id === id);
              if (!card) return;
              const patch = productionDragPatch(card, column.id);
              if (!patch) return;
              onMove(card, column.id);
            }}
            style={{
              minHeight: 0,
              display: 'flex',
              flexDirection: 'column',
              border: `1px solid ${colors.border}`,
              borderRadius: 12,
              overflow: 'auto',
            }}
          >
            <h2 style={{ margin: spacing.sm, fontSize: font.sizeSm }}>{column.title}</h2>
            {columns[column.id].map((card) => {
              const date = productionDateKey(card.date);
              const time = productionTimeKey(card.time);
              const expanded = expandedId === card.id;
              return (
                <article
                  key={card.id}
                  draggable
                  onDragStart={(event) => {
                    dragged.current = true;
                    draggingId.current = card.id;
                    try {
                      event.dataTransfer.setData('text/plain', card.id);
                    } catch {
                      // Some environments throw; draggingId still identifies the card.
                    }
                  }}
                  onDragEnd={() => {
                    dragged.current = false;
                    draggingId.current = null;
                  }}
                  onClick={() => {
                    if (dragged.current) {
                      dragged.current = false;
                      return;
                    }
                    setExpandedId((current) => (current === card.id ? null : card.id));
                  }}
                  style={{
                    margin: `0 ${spacing.sm} ${spacing.sm}`,
                    padding: spacing.sm,
                    border: `1px solid ${colors.borderSubtle}`,
                    borderRadius: 10,
                    cursor: 'grab',
                  }}
                >
                  <strong>{card.name}</strong>
                  {card.dealName ? <div>{card.dealName}</div> : null}
                  {date || time ? <div>{[date, time].filter(Boolean).join(' ')}</div> : null}
                  {expanded ? (
                    <div>
                      <button type="button" onClick={(event) => {
                        event.stopPropagation();
                        setExpandedId(null);
                      }}
                      >
                        Свернуть
                      </button>
                      <p>{card.comment}</p>
                      <p>{checkText('Взято', card.vzato)}</p>
                      <p>{checkText('Готово', card.gotovo)}</p>
                      <p>{card.date ?? ''}</p>
                      <p>{card.time ?? ''}</p>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>
        ))}
      </div>
    </div>
  );
};
