export const ganttBarRect = (
  startsAt: string,
  endsAt: string,
  weekStartIso: string,
  weekEndIso: string,
): { leftPct: number; widthPct: number } | null => {
  const weekStart = Date.parse(weekStartIso);
  const weekEnd = Date.parse(weekEndIso);
  const clippedStart = Math.max(Date.parse(startsAt), weekStart);
  const clippedEnd = Math.min(Date.parse(endsAt), weekEnd);
  if (clippedStart >= clippedEnd) return null;

  const weekMs = weekEnd - weekStart;
  return {
    leftPct: ((clippedStart - weekStart) / weekMs) * 100,
    widthPct: Math.max(((clippedEnd - clippedStart) / weekMs) * 100, 0.4),
  };
};
