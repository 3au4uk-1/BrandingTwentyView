import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

import { updateLineItem } from '../api/line-items';
import { ThemeProvider } from '../theme/ThemeContext';
import {
  PRODUCTION_DRAG_ERROR,
  PRODUCTION_LOAD_ERROR,
  productionDragPatch,
  type ProductionCard,
  type ProductionColumnId,
} from './board';
import { ProductionBoard } from './ProductionBoard';
import {
  assembleProductionCards,
  fetchProductionLineRecords,
  fetchProductionOpportunities,
} from './fetch-production-cards';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

const ProductionPageInner = () => {
  const [overrides, setOverrides] = useState<Record<string, { vzato: boolean; gotovo: boolean }>>({});
  const [moveError, setMoveError] = useState<string | null>(null);
  const cardsQuery = useQuery({
    queryKey: ['production-kanban'],
    queryFn: async () => {
      const lines = await fetchProductionLineRecords();
      const opportunities = await fetchProductionOpportunities(
        lines.map((line) => line.opportunityId).filter((id): id is string => Boolean(id)),
      );
      return assembleProductionCards(lines, opportunities);
    },
  });

  const cards = useMemo(
    () =>
      (cardsQuery.data ?? []).map((card) =>
        overrides[card.id] ? { ...card, ...overrides[card.id] } : card,
      ),
    [cardsQuery.data, overrides],
  );

  const onMove = (card: ProductionCard, column: ProductionColumnId) => {
    const patch = productionDragPatch(card, column);
    if (!patch) return;
    setOverrides((current) => ({
      ...current,
      [card.id]: {
        vzato: patch.vzatoVRabotuProizvodstva,
        gotovo: patch.gotovoProizvodstva,
      },
    }));
    setMoveError(null);
    void updateLineItem(card.id, patch).catch(() => {
      setOverrides((current) => {
        const next = { ...current };
        delete next[card.id];
        return next;
      });
      setMoveError(PRODUCTION_DRAG_ERROR);
    });
  };

  return (
    <div style={{ height: '100%', minHeight: 0 }}>
      <ProductionBoard
        cards={cards}
        loading={cardsQuery.isPending}
        error={cardsQuery.isError ? PRODUCTION_LOAD_ERROR : moveError}
        onMove={onMove}
      />
    </div>
  );
};

export const ProductionPage = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <ProductionPageInner />
    </ThemeProvider>
  </QueryClientProvider>
);
