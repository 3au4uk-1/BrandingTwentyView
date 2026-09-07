import { useQuery } from '@tanstack/react-query';

import { fetchBannerCrewSlots } from './api';

export const bannerCrewSlotsQueryKey = ['banner-crew-slots'] as const;

export const useBannerCrewSlots = () =>
  useQuery({
    queryKey: bannerCrewSlotsQueryKey,
    queryFn: fetchBannerCrewSlots,
    staleTime: 15_000,
  });
