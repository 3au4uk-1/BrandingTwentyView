export const EMPTY_SELECT_VALUE = '';

export const resolveSelectDisplayValue = (
  value: string | null | undefined,
): string => value ?? EMPTY_SELECT_VALUE;

export const selectValueToPatch = (nextValue: string): string | null =>
  nextValue === EMPTY_SELECT_VALUE ? null : nextValue;
