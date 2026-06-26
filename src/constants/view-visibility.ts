export const VIEW_VISIBILITY = {
  PERSONAL: 'PERSONAL',
  WORKSPACE: 'WORKSPACE',
} as const;

export type ViewVisibility = (typeof VIEW_VISIBILITY)[keyof typeof VIEW_VISIBILITY];
