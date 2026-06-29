import { useQuery } from '@tanstack/react-query';

import { fetchCompanies } from '../api/companies';

export const companiesQueryKey = (search: string) => ['companies', search] as const;

export const useCompanies = (search: string, enabled = true) =>
  useQuery({
    queryKey: companiesQueryKey(search),
    queryFn: () => fetchCompanies({ search: search || undefined }),
    enabled,
    staleTime: 60_000,
  });
