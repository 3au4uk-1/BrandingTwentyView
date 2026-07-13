export const LINE_ITEM_ORIGIN = {
  PARSER: 'PARSER',
  TWENTY_MANUAL: 'TWENTY_RUCHNAYA',
} as const;

export type LineItemOrigin = (typeof LINE_ITEM_ORIGIN)[keyof typeof LINE_ITEM_ORIGIN];

export const DEFAULT_MANUAL_LINE_ITEM_NAME = 'Новая позиция';
