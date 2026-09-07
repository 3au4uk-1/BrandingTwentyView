import type { BannerCrewLocation } from 'src/constants/banner-crew';

export type BannerCrewSlot = {
  id: string;
  opportunityId: string | null;
  opportunityName: string | null;
  opportunityStage: string | null;
  supplierId: string | null;
  supplierName: string | null;
  location: BannerCrewLocation;
  startsAt: string | null;
  endsAt: string | null;
};
