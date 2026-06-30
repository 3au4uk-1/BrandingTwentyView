import type { LineItemStage, OpportunityStage } from 'src/constants/stages';

type PositionLike = { stage?: LineItemStage | string | null };

export const computeDealStage = (
  positions: ReadonlyArray<PositionLike>,
): OpportunityStage => {
  const active = positions.filter((p) => p.stage !== 'OTMENA');

  if (active.length === 0) return 'OTMENA';
  if (active.every((p) => (p.stage ?? 'NOVYY') === 'NOVYY')) return 'NOVYY';
  if (active.every((p) => p.stage === 'GOTOVO')) return 'GOTOVO';
  return 'V_RABOTE';
};
