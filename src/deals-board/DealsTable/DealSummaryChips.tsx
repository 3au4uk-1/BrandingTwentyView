import { Chip, type ChipColor } from '../Chip';
import { useTheme } from '../theme/ThemeContext';

import {
  getStageColor,
  getStageLabel,
  LINE_ITEM_STAGE_ORDER,
  type LineItemStage,
} from 'src/constants/stages';

import type { LineItemRow } from '../types';

type DealSummaryChipsProps = {
  items: LineItemRow[];
};

export const DealSummaryChips = ({ items }: DealSummaryChipsProps) => {
  const theme = useTheme();
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = item.stage ?? 'NOVYY';
    if (key === 'OTMENA') continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const stageChips = [...counts.entries()].sort(
    ([left], [right]) =>
      LINE_ITEM_STAGE_ORDER.indexOf(left as LineItemStage) -
      LINE_ITEM_STAGE_ORDER.indexOf(right as LineItemStage),
  );

  if (stageChips.length === 0) {
    return null;
  }

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      {stageChips.map(([stage, count]) => (
        <Chip
          key={stage}
          text={`${count} ${getStageLabel(stage)}`}
          color={getStageColor(stage) as ChipColor}
          theme={theme}
        />
      ))}
    </div>
  );
};
