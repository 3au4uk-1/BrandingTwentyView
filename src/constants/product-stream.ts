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

export function normalizeProductStream(raw: unknown): ProductStream {
  if (raw === PRODUCT_STREAM.DECOR || raw === PRODUCT_STREAM.MK) {
    return raw;
  }
  return PRODUCT_STREAM.BRANDING;
}

export function lineItemMatchesBoardStream(
  stream: ProductStream,
  boardStream: BoardStream,
): boolean {
  if (boardStream === BOARD_STREAM.BRANDING) {
    return stream === PRODUCT_STREAM.BRANDING;
  }
  return stream === PRODUCT_STREAM.DECOR || stream === PRODUCT_STREAM.MK;
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
    lineItemMatchesBoardStream(normalizeProductStream(item.productStream), boardStream),
  );
}
