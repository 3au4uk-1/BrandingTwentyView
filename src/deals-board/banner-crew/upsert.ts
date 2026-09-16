import type { BannerCrewLocation } from 'src/constants/banner-crew';
import type { BannerCrewSlot } from './types';

export function findSlotForTriple(
  slots: BannerCrewSlot[],
  opportunityId: string,
  supplierId: string,
  location: BannerCrewLocation,
): BannerCrewSlot | undefined {
  return slots.find(
    (s) =>
      s.opportunityId === opportunityId &&
      s.supplierId === supplierId &&
      s.location === location,
  );
}
