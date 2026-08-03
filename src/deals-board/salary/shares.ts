import { entrySumRub, type OkleykaSalaryEntry } from './fund';

export type OkleykaDealShare = {
  id: string;
  opportunityId: string;
  salaryEntryId: string;
  amountRub: number;
};

/** Split totalRub into n integer ₽ parts that sum exactly to totalRub. */
export const roundEqualParts = (totalRub: number, n: number): number[] => {
  if (n <= 0) return [];
  const base = Math.floor(totalRub / n);
  const remainder = totalRub - base * n;
  const parts = Array<number>(n).fill(base);
  for (let i = 0; i < remainder; i++) {
    parts[i]! += 1;
  }
  return parts;
};

export const buildEqualPersonShares = (
  entryIds: string[],
  entrySumById: Record<string, number>,
  opportunityIds: string[],
): Array<{ opportunityId: string; salaryEntryId: string; amountRub: number }> => {
  if (opportunityIds.length === 0) return [];
  const rows: Array<{ opportunityId: string; salaryEntryId: string; amountRub: number }> = [];
  for (const salaryEntryId of entryIds) {
    const parts = roundEqualParts(entrySumById[salaryEntryId] ?? 0, opportunityIds.length);
    for (let i = 0; i < opportunityIds.length; i++) {
      rows.push({
        opportunityId: opportunityIds[i]!,
        salaryEntryId,
        amountRub: parts[i]!,
      });
    }
  }
  return rows;
};

export const sumSharesByOpportunity = (
  shares: Array<{ opportunityId: string; amountRub: number }>,
): Map<string, number> => {
  const map = new Map<string, number>();
  for (const share of shares) {
    map.set(share.opportunityId, (map.get(share.opportunityId) ?? 0) + share.amountRub);
  }
  return map;
};

/** Equal split of each person's period sum across all deals in the half. */
export const planHalfPersonDistribute = (args: {
  entries: OkleykaSalaryEntry[];
  opportunityIds: string[];
}): Array<{ opportunityId: string; salaryEntryId: string; amountRub: number }> => {
  if (args.opportunityIds.length === 0 || args.entries.length === 0) return [];

  const entrySumById: Record<string, number> = {};
  for (const entry of args.entries) {
    entrySumById[entry.id] = entrySumRub(entry);
  }

  return buildEqualPersonShares(
    args.entries.map((entry) => entry.id),
    entrySumById,
    args.opportunityIds,
  );
};
