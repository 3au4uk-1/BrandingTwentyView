import { getOpportunityStageColor, getStageColor } from 'src/constants/stages';

import { getChipPalette, type ChipColor } from '../Chip';
import type { ColorScheme } from '../theme/tokens';

/**
 * Stage cue: soft wash + solid left rail.
 * Color lives mainly in the rail + filled stage chip — wash stays quiet.
 */
const STAGE_ROW_WASH: Record<string, { light: string; dark: string }> = {
  white: { light: 'transparent', dark: 'transparent' },
  gray: { light: 'transparent', dark: 'transparent' },
  yellow: {
    light: 'rgba(255, 204, 0, 0.08)',
    dark: 'rgba(255, 214, 10, 0.09)',
  },
  blue: {
    light: 'rgba(0, 122, 255, 0.07)',
    dark: 'rgba(10, 132, 255, 0.1)',
  },
  purple: {
    light: 'rgba(175, 82, 222, 0.07)',
    dark: 'rgba(191, 90, 242, 0.1)',
  },
  orange: {
    light: 'rgba(255, 149, 0, 0.07)',
    dark: 'rgba(255, 159, 10, 0.1)',
  },
  green: {
    light: 'rgba(52, 199, 89, 0.07)',
    dark: 'rgba(48, 209, 88, 0.1)',
  },
  greenDark: {
    light: 'rgba(36, 138, 61, 0.07)',
    dark: 'rgba(48, 209, 88, 0.08)',
  },
  red: {
    light: 'rgba(255, 59, 48, 0.07)',
    dark: 'rgba(255, 69, 58, 0.1)',
  },
  pink: {
    light: 'rgba(255, 45, 85, 0.06)',
    dark: 'rgba(255, 55, 95, 0.09)',
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
    boxShadow: isNeutral ? undefined : `inset 4px 0 0 ${palette.text}`,
  };
};
