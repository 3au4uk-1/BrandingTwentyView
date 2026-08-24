import { useQuery } from '@tanstack/react-query';

import { fetchSuppliers } from '../api/suppliers';

export const suppliersQueryKey = ['suppliers'] as const;

export const useSuppliers = () =>
  useQuery({
    queryKey: suppliersQueryKey,
    queryFn: fetchSuppliers,
    staleTime: 30_000,
  });
