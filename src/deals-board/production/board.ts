export type ProductionColumnId = 'ne-vzyato' | 'v-rabote' | 'gotovo';

export type ProductionCard = {
  id: string;
  name: string;
  dealName: string;
  date: string | null;
  time: string | null;
  comment: string;
  vzato: boolean;
  gotovo: boolean;
};

export type ProductionSource = ProductionCard & { flagged: boolean };

export const PRODUCTION_COLUMNS: { id: ProductionColumnId; title: string }[] = [
  { id: 'ne-vzyato', title: 'Не взято' },
  { id: 'v-rabote', title: 'В работе' },
  { id: 'gotovo', title: 'Готово' },
];

export const PRODUCTION_LOAD_ERROR = 'Не удалось загрузить производство';
export const PRODUCTION_DRAG_ERROR = 'Не удалось сохранить перенос';

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;
const CLOCK = /^([01]\d|2[0-3]):[0-5]\d$/;

export const productionDateKey = (value: string | null): string | null => {
  if (!value) return null;
  return DATE_PREFIX.exec(value)?.[1] ?? null;
};

export const productionTimeKey = (value: string | null): string | null => {
  if (!value || !CLOCK.test(value)) return null;
  return value;
};

export const productionColumn = (card: {
  vzato: boolean;
  gotovo: boolean;
}): ProductionColumnId => {
  if (card.gotovo) return 'gotovo';
  if (card.vzato) return 'v-rabote';
  return 'ne-vzyato';
};

export const productionDragPatch = (
  card: { vzato: boolean; gotovo: boolean },
  target: ProductionColumnId,
): { vzatoVRabotuProizvodstva: boolean; gotovoProizvodstva: boolean } | null => {
  if (productionColumn(card) === target) return null;
  if (target === 'gotovo') {
    return { vzatoVRabotuProizvodstva: true, gotovoProizvodstva: true };
  }
  if (target === 'v-rabote') {
    return { vzatoVRabotuProizvodstva: true, gotovoProizvodstva: false };
  }
  return { vzatoVRabotuProizvodstva: false, gotovoProizvodstva: false };
};

export const productionChipLabel = (input: {
  flagged: boolean;
  vzato: boolean;
  gotovo: boolean;
}): string => {
  if (!input.flagged) return 'Производство';
  if (input.gotovo) return 'Производство - Готово';
  if (input.vzato) return 'Производство - взято';
  return 'Производство - не взято';
};

export const productionChipTone = (input: {
  flagged: boolean;
  vzato: boolean;
  gotovo: boolean;
}): 'idle' | 'vzato' | 'gotovo' => {
  if (!input.flagged || (!input.gotovo && !input.vzato)) return 'idle';
  if (input.gotovo) return 'gotovo';
  return 'vzato';
};

export const visibleProductionCards = (sources: ProductionSource[]): ProductionCard[] =>
  sources
    .filter((source) => source.flagged)
    .map(({ flagged: _flagged, ...card }) => card);

const compareCards = (left: ProductionCard, right: ProductionCard): number => {
  const leftDate = productionDateKey(left.date);
  const rightDate = productionDateKey(right.date);
  if ((leftDate == null) !== (rightDate == null)) return leftDate == null ? 1 : -1;
  if (leftDate && rightDate && leftDate !== rightDate) return leftDate < rightDate ? -1 : 1;
  const leftTime = productionTimeKey(left.time);
  const rightTime = productionTimeKey(right.time);
  if ((leftTime == null) !== (rightTime == null)) return leftTime == null ? 1 : -1;
  if (leftTime && rightTime && leftTime !== rightTime) return leftTime < rightTime ? -1 : 1;
  return left.name.localeCompare(right.name, 'ru');
};

export const sortProductionCards = (cards: ProductionCard[]): ProductionCard[] =>
  [...cards].sort(compareCards);

export const placeProductionBoard = (
  cards: ProductionCard[],
): Record<ProductionColumnId, ProductionCard[]> => {
  const columns: Record<ProductionColumnId, ProductionCard[]> = {
    'ne-vzyato': [],
    'v-rabote': [],
    gotovo: [],
  };
  for (const card of cards) columns[productionColumn(card)].push(card);
  for (const column of PRODUCTION_COLUMNS) {
    columns[column.id] = sortProductionCards(columns[column.id]);
  }
  return columns;
};
