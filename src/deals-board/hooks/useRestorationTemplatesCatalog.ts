import { useQuery } from '@tanstack/react-query';

import { STANDARD_RESTORATION_MAKETS } from 'src/constants/standard-restoration-makets';

import { fetchRestorationTemplatesCatalog } from '../api/restoration-templates';

export const restorationTemplatesCatalogQueryKey = [
  'restorationTemplatesCatalog',
] as const;

export const useRestorationTemplatesCatalog = () => {
  const query = useQuery({
    queryKey: restorationTemplatesCatalogQueryKey,
    queryFn: fetchRestorationTemplatesCatalog,
    staleTime: 60_000,
  });

  const entries =
    query.isError || !query.data?.length
      ? STANDARD_RESTORATION_MAKETS
      : query.data;

  return { entries, isLoading: query.isLoading };
};
