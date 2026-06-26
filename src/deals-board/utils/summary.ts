import { getStageLabel } from 'src/constants/stages';

const SHORT_LABELS: Record<string, string> = {
  NOVYY: 'нов',
  V_RABOTE: 'работа',
  V_PECHATI: 'печать',
  OKLEYKA: 'оклейка',
  GOTOVO: 'готово',
  RESTAVRACIYA: 'реставр',
  OTMENA: 'отмена',
};

export const buildStageSummary = (
  items: ReadonlyArray<{ stage?: string | null }>,
): string => {
  if (items.length === 0) return '0 позиций';

  const counts = new Map<string, number>();
  for (const item of items) {
    const key = item.stage ?? 'NOVYY';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const parts = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([stage, count]) => `${count} ${SHORT_LABELS[stage] ?? getStageLabel(stage)}`);

  return `${items.length} поз.: ${parts.join(' · ')}`;
};
