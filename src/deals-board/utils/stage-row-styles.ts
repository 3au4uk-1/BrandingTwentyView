import { getOpportunityStageColor, getStageColor } from 'src/constants/stages';

import { getChipPalette, type ChipColor } from '../Chip';
import type { ColorScheme } from '../theme/tokens';

/** Saturated dark row washes (TwentyServer-like); softer in light mode. */
const STAGE_ROW_WASH: Record<
  string,
  { light: string; dark: string }
> = {
  white: {
    light: 'transparent',
    dark: 'transparent',
  },
  gray: {
    light: 'transparent',
    dark: 'transparent',
  },
  yellow: {
    light: 'rgba(255, 204, 0, 0.22)',
    dark: 'rgba(180, 140, 20, 0.55)',
  },
  blue: {
    light: 'rgba(0, 122, 255, 0.16)',
    dark: 'rgba(20, 70, 140, 0.62)',
  },
  purple: {
    light: 'rgba(175, 82, 222, 0.16)',
    dark: 'rgba(90, 40, 130, 0.62)',
  },
  orange: {
    light: 'rgba(255, 149, 0, 0.16)',
    dark: 'rgba(140, 80, 20, 0.58)',
  },
  green: {
    light: 'rgba(52, 199, 89, 0.16)',
    dark: 'rgba(25, 90, 50, 0.62)',
  },
  greenDark: {
    light: 'rgba(36, 138, 61, 0.16)',
    dark: 'rgba(20, 75, 42, 0.62)',
  },
  red: {
    light: 'rgba(255, 59, 48, 0.14)',
    dark: 'rgba(120, 30, 30, 0.62)',
  },
  pink: {
    light: 'rgba(255, 45, 85, 0.14)',
    dark: 'rgba(120, 35, 70, 0.55)',
  },
};

export const getStageRowStyles = (
  stage: string | null | undefined,
  colorScheme: ColorScheme,
  variant: 'parent' | 'child' = 'child',
) => {
  const colorName =
    variant === 'parent'
      ? getOpportunityStageColor(stage ?? 'NOVYY')
      : getStageColor(stage ?? 'NOVYY');
  const palette = getChipPalette(colorName as ChipColor, colorScheme);
  const wash = STAGE_ROW_WASH[colorName]?.[colorScheme] ?? STAGE_ROW_WASH.white[colorScheme];
  const isNeutral = colorName === 'white' || colorName === 'gray' || wash === 'transparent';

  return {
    backgroundColor: isNeutral ? undefined : wash,
    accentColor: palette.text,
    boxShadow: isNeutral ? undefined : `inset 3px 0 0 ${palette.text}`,
  };
};
