import { getOpportunityStageColor, getStageColor } from 'src/constants/stages';

import { getChipPalette, type ChipColor } from '../Chip';
import type { ColorScheme } from '../theme/tokens';

export const getStageRowStyles = (
  stage: string | null | undefined,
  colorScheme: ColorScheme,
  variant: 'parent' | 'child' = 'child',
) => {
  const color =
    variant === 'parent'
      ? getOpportunityStageColor(stage ?? 'NOVYY')
      : getStageColor(stage ?? 'NOVYY');
  const palette = getChipPalette(color as ChipColor, colorScheme);

  return {
    backgroundColor: palette.bg,
    accentColor: palette.text,
    boxShadow: `inset 3px 0 0 ${palette.text}`,
  };
};
