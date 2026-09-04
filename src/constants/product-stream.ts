export const PRODUCT_STREAM = {
  BRANDING: 'BRANDING',
  DECOR: 'DECOR',
  MK: 'MK',
} as const;

export type ProductStream = (typeof PRODUCT_STREAM)[keyof typeof PRODUCT_STREAM];

export const BOARD_STREAM = {
  BRANDING: 'branding',
  DECOR_MK: 'decor_mk',
} as const;

export type BoardStream = (typeof BOARD_STREAM)[keyof typeof BOARD_STREAM];

export const BOARD_KIND = {
  REALIZACIYA: 'REALIZACIYA',
  DECOR_MK: 'DECOR_MK',
} as const;

export type BoardKind = (typeof BOARD_KIND)[keyof typeof BOARD_KIND];

const STREAM_ORDER: ProductStream[] = [
  PRODUCT_STREAM.MK,
  PRODUCT_STREAM.DECOR,
  PRODUCT_STREAM.BRANDING,
];

export function normalizeProductStreams(raw: unknown): ProductStream[] {
  const values = Array.isArray(raw) ? raw : raw == null || raw === '' ? [] : [raw];
  const allowed = new Set<string>(STREAM_ORDER);
  const present = new Set(
    values.filter((value): value is ProductStream => allowed.has(String(value))),
  );
  return STREAM_ORDER.filter((stream) => present.has(stream));
}

export function lineItemMatchesBoardStream(
  streams: readonly ProductStream[],
  boardStream: BoardStream,
): boolean {
  if (boardStream === BOARD_STREAM.BRANDING) {
    return streams.includes(PRODUCT_STREAM.BRANDING);
  }
  return streams.includes(PRODUCT_STREAM.DECOR) || streams.includes(PRODUCT_STREAM.MK);
}

export function boardStreamToBoardKind(boardStream: BoardStream): BoardKind {
  return boardStream === BOARD_STREAM.DECOR_MK
    ? BOARD_KIND.DECOR_MK
    : BOARD_KIND.REALIZACIYA;
}

export function normalizeBoardKind(raw: unknown): BoardKind {
  if (raw === BOARD_KIND.DECOR_MK) {
    return BOARD_KIND.DECOR_MK;
  }
  return BOARD_KIND.REALIZACIYA;
}

export function filterLineItemsByBoardStream<T extends { productStream?: unknown }>(
  items: T[],
  boardStream: BoardStream,
): T[] {
  return items.filter((item) =>
    lineItemMatchesBoardStream(normalizeProductStreams(item.productStream), boardStream),
  );
}
