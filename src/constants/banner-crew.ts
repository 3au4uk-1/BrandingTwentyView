export const BANNER_CREW_LOCATIONS = ['SITE', 'BASE'] as const;
export type BannerCrewLocation = (typeof BANNER_CREW_LOCATIONS)[number];

export const BANNER_CREW_LOCATION_LABEL: Record<BannerCrewLocation, string> = {
  SITE: 'на объекте',
  BASE: 'на базе',
};
