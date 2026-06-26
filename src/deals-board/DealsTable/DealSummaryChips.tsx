import { Chip, type ChipColor } from '../Chip';
import { useTheme } from '../theme/ThemeContext';

import { getStageColor, getStageLabel } from 'src/constants/stages';

import { buildStageSummary } from '../utils/summary';
import type { LineItemRow } from '../types';

type DealSummaryChipsProps = {
  items: LineItemRow[];
};

export const DealSummaryChips = ({ items }: DealSummaryChipsProps) => {
  const theme = useTheme();
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = item.stage ?? 'NOVYY';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const stageChips = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      <Chip text={buildStageSummary(items)} color="gray" theme={theme} />
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
