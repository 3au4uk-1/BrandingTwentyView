import type { BannerCrewSlot } from './types';
import type { BannerDealInput } from './calendar-layout';

export type BannerOpportunityRecord = {
  id: string;
  name: string;
  stage: string | null;
  address: string | null;
  loadDate: string | null;
};

export type BannerLineRecord = {
  opportunityId: string | null;
  name: string;
  tip: string | null;
};

export const assembleBannerDeals = (
  opportunities: BannerOpportunityRecord[],
  lines: BannerLineRecord[],
  slots: BannerCrewSlot[],
): BannerDealInput[] => {
  const namesByOpportunity = new Map<string, string[]>();
  for (const line of lines) {
    if (line.tip !== 'BANNERA' || !line.opportunityId) continue;
    const name = line.name.trim();
    const list = namesByOpportunity.get(line.opportunityId) ?? [];
    if (name && !list.includes(name)) list.push(name);
    namesByOpportunity.set(line.opportunityId, list);
  }

  return opportunities.flatMap((opportunity) => {
    const positionNames = namesByOpportunity.get(opportunity.id);
    if (!positionNames) return [];
    return [
      {
        id: opportunity.id,
        name: opportunity.name,
        stage: opportunity.stage,
        address: opportunity.address?.trim() ?? '',
        loadDate: opportunity.loadDate,
        positionNames,
        slots: slots
          .filter((item) => item.opportunityId === opportunity.id)
          .map((item) => ({
            supplierId: item.supplierId,
            supplierName: item.supplierName,
            startsAt: item.startsAt,
            endsAt: item.endsAt,
          })),
      },
    ];
  });
};
