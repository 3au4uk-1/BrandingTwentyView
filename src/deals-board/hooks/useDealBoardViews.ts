import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  DEFAULT_CHILD_COLUMNS,
  DEFAULT_PARENT_COLUMNS,
} from 'src/constants/column-definitions';
import { VIEW_VISIBILITY } from 'src/constants/view-visibility';

import {
  createDealBoardView,
  fetchDealBoardViews,
  updateDealBoardView,
} from '../api/views';
import type { DealBoardViewRecord } from '../types';

export const dealBoardViewsQueryKey = () => ['dealBoardViews'] as const;

export const useDealBoardViews = () => {
  const queryClient = useQueryClient();
  const hasSeedAttemptedRef = useRef(false);
  const seedDefaultViewMutation = useMutation({
    mutationFn: () =>
      createDealBoardView({
        name: 'Базовый обзор',
        visibility: VIEW_VISIBILITY.WORKSPACE,
        parentColumns: DEFAULT_PARENT_COLUMNS,
        childColumns: DEFAULT_CHILD_COLUMNS,
        filters: {},
        sort: [],
        isDefault: true,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealBoardViewsQueryKey() });
    },
    onError: () => {
      hasSeedAttemptedRef.current = false;
    },
  });

  const query = useQuery({
    queryKey: dealBoardViewsQueryKey(),
    queryFn: fetchDealBoardViews,
  });
  const viewCount = query.data?.length ?? 0;

  useEffect(() => {
    if (!query.isSuccess || viewCount > 0 || hasSeedAttemptedRef.current) {
      return;
    }

    hasSeedAttemptedRef.current = true;
    seedDefaultViewMutation.mutate();
  }, [query.isSuccess, seedDefaultViewMutation.mutate, viewCount]);

  return {
    ...query,
    isSeedingDefault: seedDefaultViewMutation.isPending,
  };
};

export const useCreateDealBoardView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: Omit<DealBoardViewRecord, 'id'>) => createDealBoardView(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealBoardViewsQueryKey() });
    },
  });
};

export const useUpdateDealBoardView = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Omit<DealBoardViewRecord, 'id'>>;
    }) => updateDealBoardView(id, data),
    onMutate: async ({ id, data }) => {
      await queryClient.cancelQueries({ queryKey: dealBoardViewsQueryKey() });
      const previous = queryClient.getQueryData<DealBoardViewRecord[]>(dealBoardViewsQueryKey());

      queryClient.setQueryData<DealBoardViewRecord[]>(dealBoardViewsQueryKey(), (current) =>
        current?.map((view) => (view.id === id ? { ...view, ...data } : view)),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(dealBoardViewsQueryKey(), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: dealBoardViewsQueryKey() });
    },
  });
};
