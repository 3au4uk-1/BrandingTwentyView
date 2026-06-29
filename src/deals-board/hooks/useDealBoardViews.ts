import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  DEFAULT_CHILD_COLUMNS,
  DEFAULT_PARENT_COLUMNS,
} from 'src/constants/column-definitions';
import { OPPORTUNITY_DATE_FILTER_FIELD } from 'src/constants/date-filter-field';
import { VIEW_VISIBILITY } from 'src/constants/view-visibility';

import {
  createDealBoardView,
  fetchDealBoardViews,
  updateDealBoardView,
} from '../api/views';
import type { DealBoardViewRecord } from '../types';

export const dealBoardViewsQueryKey = () => ['dealBoardViews'] as const;

const FUTURE_DEALS_VIEW_NAME = 'Будущие сделки';

const DEFAULT_VIEW_SEED: Omit<DealBoardViewRecord, 'id'> = {
  name: 'Базовый обзор',
  visibility: VIEW_VISIBILITY.WORKSPACE,
  parentColumns: DEFAULT_PARENT_COLUMNS,
  childColumns: DEFAULT_CHILD_COLUMNS,
  filters: {},
  sort: [],
  isDefault: false,
};

const FUTURE_DEALS_VIEW_SEED: Omit<DealBoardViewRecord, 'id'> = {
  name: FUTURE_DEALS_VIEW_NAME,
  visibility: VIEW_VISIBILITY.WORKSPACE,
  parentColumns: DEFAULT_PARENT_COLUMNS,
  childColumns: DEFAULT_CHILD_COLUMNS,
  filters: { datePreset: 'future' },
  sort: [{ field: OPPORTUNITY_DATE_FILTER_FIELD, direction: 'AscNullsLast' }],
  isDefault: true,
};

const isFutureDealsDefault = (views: DealBoardViewRecord[]): boolean => {
  const futureView = views.find((view) => view.name === FUTURE_DEALS_VIEW_NAME);
  if (!futureView?.isDefault) return false;

  return !views.some((view) => view.id !== futureView.id && view.isDefault);
};

const promoteFutureDealsViewAsDefault = async (
  views: DealBoardViewRecord[],
): Promise<void> => {
  const futureView = views.find((view) => view.name === FUTURE_DEALS_VIEW_NAME);
  if (!futureView) return;

  await Promise.all(
    views
      .filter((view) => view.isDefault && view.id !== futureView.id)
      .map((view) => updateDealBoardView(view.id, { isDefault: false })),
  );

  if (!futureView.isDefault) {
    await updateDealBoardView(futureView.id, { isDefault: true });
  }
};

export const useDealBoardViews = () => {
  const queryClient = useQueryClient();
  const hasSeedAttemptedRef = useRef(false);
  const hasFutureSeedAttemptedRef = useRef(false);
  const hasDefaultMigrationAttemptedRef = useRef(false);
  const seedDefaultViewMutation = useMutation({
    mutationFn: async () => {
      await createDealBoardView(DEFAULT_VIEW_SEED);
      await createDealBoardView(FUTURE_DEALS_VIEW_SEED);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealBoardViewsQueryKey() });
    },
    onError: () => {
      hasSeedAttemptedRef.current = false;
    },
  });

  const ensureFutureViewMutation = useMutation({
    mutationFn: async () => {
      const views = await fetchDealBoardViews();
      await promoteFutureDealsViewAsDefault(views);
      await createDealBoardView(FUTURE_DEALS_VIEW_SEED);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealBoardViewsQueryKey() });
    },
    onError: () => {
      hasFutureSeedAttemptedRef.current = false;
    },
  });

  const promoteFutureDefaultMutation = useMutation({
    mutationFn: promoteFutureDealsViewAsDefault,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealBoardViewsQueryKey() });
    },
    onError: () => {
      hasDefaultMigrationAttemptedRef.current = false;
    },
  });

  const query = useQuery({
    queryKey: dealBoardViewsQueryKey(),
    queryFn: fetchDealBoardViews,
  });
  const viewCount = query.data?.length ?? 0;
  const hasFutureView = query.data?.some((view) => view.name === FUTURE_DEALS_VIEW_NAME) ?? false;

  useEffect(() => {
    if (!query.isSuccess || viewCount > 0 || hasSeedAttemptedRef.current) {
      return;
    }

    hasSeedAttemptedRef.current = true;
    seedDefaultViewMutation.mutate();
  }, [query.isSuccess, seedDefaultViewMutation.mutate, viewCount]);

  useEffect(() => {
    if (
      !query.isSuccess ||
      viewCount === 0 ||
      hasFutureView ||
      hasFutureSeedAttemptedRef.current ||
      ensureFutureViewMutation.isPending
    ) {
      return;
    }

    hasFutureSeedAttemptedRef.current = true;
    ensureFutureViewMutation.mutate();
  }, [
    ensureFutureViewMutation.isPending,
    ensureFutureViewMutation.mutate,
    hasFutureView,
    query.isSuccess,
    viewCount,
  ]);

  useEffect(() => {
    if (
      !query.isSuccess ||
      viewCount === 0 ||
      !hasFutureView ||
      hasDefaultMigrationAttemptedRef.current ||
      promoteFutureDefaultMutation.isPending ||
      isFutureDealsDefault(query.data ?? [])
    ) {
      return;
    }

    hasDefaultMigrationAttemptedRef.current = true;
    promoteFutureDefaultMutation.mutate(query.data ?? []);
  }, [
    hasFutureView,
    promoteFutureDefaultMutation.isPending,
    promoteFutureDefaultMutation.mutate,
    query.data,
    query.isSuccess,
    viewCount,
  ]);

  return {
    ...query,
    isSeedingDefault:
      seedDefaultViewMutation.isPending ||
      ensureFutureViewMutation.isPending ||
      promoteFutureDefaultMutation.isPending,
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
