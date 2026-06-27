import { useQuery } from '@tanstack/react-query';

import { fetchFieldDescriptors } from './fetch-object-fields';
import type { BoardObjectName, FieldDescriptor } from './types';

export const objectFieldsQueryKey = (objectName: BoardObjectName) =>
  ['objectFields', objectName] as const;

export const useObjectFields = (objectName: BoardObjectName) =>
  useQuery<FieldDescriptor[]>({
    queryKey: objectFieldsQueryKey(objectName),
    queryFn: () => fetchFieldDescriptors(objectName),
    staleTime: 5 * 60_000,
  });
