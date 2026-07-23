import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  DEFAULT_CHILD_COLUMNS,
  DEFAULT_CHILD_GROUPS,
  DEFAULT_PARENT_COLUMNS,
} from 'src/constants/column-definitions';
import {
  FUTURE_DEALS_VIEW_FILTERS,
  FUTURE_DEALS_VIEW_NAME,
  FUTURE_DEALS_VIEW_SORT,
  hasFutureDealsViewMechanics,
} from 'src/constants/future-deals-view';
import { MOBILE_VIEW_NAME } from 'src/constants/mobile-view';
import { VIEW_VISIBILITY } from 'src/constants/view-visibility';

import {
  createDealBoardView,
  fetchDealBoardViews,
  updateDealBoardView,
} from '../api/views';
import type { DealBoardViewRecord } from '../types';

export const dealBoardViewsQueryKey = () => ['dealBoardViews'] as const;

const DEFAULT_VIEW_SEED: Omit<DealBoardViewRecord, 'id'> = {
  name: 'Базовый обзор',
  visibility: VIEW_VISIBILITY.WORKSPACE,
  parentColumns: DEFAULT_PARENT_COLUMNS,
  childColumns: DEFAULT_CHILD_COLUMNS,
  childGroups: [],
  filters: {},
  sort: [],
  isDefault: false,
};

const FUTURE_DEALS_VIEW_SEED: Omit<DealBoardViewRecord, 'id'> = {
  name: FUTURE_DEALS_VIEW_NAME,
  visibility: VIEW_VISIBILITY.WORKSPACE,
  parentColumns: DEFAULT_PARENT_COLUMNS,
  childColumns: DEFAULT_CHILD_COLUMNS,
  childGroups: DEFAULT_CHILD_GROUPS,
  filters: FUTURE_DEALS_VIEW_FILTERS,
  sort: FUTURE_DEALS_VIEW_SORT,
  isDefault: true,
};

const MOBILE_VIEW_SEED: Omit<DealBoardViewRecord, 'id'> = {
  name: MOBILE_VIEW_NAME,
  visibility: VIEW_VISIBILITY.WORKSPACE,
  parentColumns: DEFAULT_PARENT_COLUMNS,
  childColumns: DEFAULT_CHILD_COLUMNS,
  childGroups: DEFAULT_CHILD_GROUPS,
  filters: FUTURE_DEALS_VIEW_FILTERS,
  sort: FUTURE_DEALS_VIEW_SORT,
  isDefault: false,
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

const alignMobileViewWithFutureDeals = async (
  views: DealBoardViewRecord[],
): Promise<void> => {
  const mobileView = views.find((view) => view.name === MOBILE_VIEW_NAME);
  if (!mobileView || hasFutureDealsViewMechanics(mobileView)) return;

  await updateDealBoardView(mobileView.id, {
    filters: FUTURE_DEALS_VIEW_FILTERS,
    sort: FUTURE_DEALS_VIEW_SORT,
  });
};

export const useDealBoardViews = () => {
  const queryClient = useQueryClient();
  const hasSeedAttemptedRef = useRef(false);
  const hasFutureSeedAttemptedRef = useRef(false);
  const hasMobileSeedAttemptedRef = useRef(false);
  const hasMobileAlignAttemptedRef = useRef(false);
  const hasDefaultMigrationAttemptedRef = useRef(false);
  const seedDefaultViewMutation = useMutation({
    mutationFn: async () => {
      await createDealBoardView(DEFAULT_VIEW_SEED);
      await createDealBoardView(FUTURE_DEALS_VIEW_SEED);
      await createDealBoardView(MOBILE_VIEW_SEED);
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

  const ensureMobileViewMutation = useMutation({
    mutationFn: async () => {
      await createDealBoardView(MOBILE_VIEW_SEED);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealBoardViewsQueryKey() });
    },
    onError: () => {
      hasMobileSeedAttemptedRef.current = false;
    },
  });

  const alignMobileViewMutation = useMutation({
    mutationFn: alignMobileViewWithFutureDeals,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: dealBoardViewsQueryKey() });
    },
    onError: () => {
      hasMobileAlignAttemptedRef.current = false;
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
  const hasMobileView = query.data?.some((view) => view.name === MOBILE_VIEW_NAME) ?? false;
  const mobileView = query.data?.find((view) => view.name === MOBILE_VIEW_NAME);
  const isMobileViewAligned =
    !mobileView || hasFutureDealsViewMechanics(mobileView);

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
      hasMobileView ||
      hasMobileSeedAttemptedRef.current ||
      ensureMobileViewMutation.isPending
    ) {
      return;
    }

    hasMobileSeedAttemptedRef.current = true;
    ensureMobileViewMutation.mutate();
  }, [
    ensureMobileViewMutation.isPending,
    ensureMobileViewMutation.mutate,
    hasMobileView,
    query.isSuccess,
    viewCount,
  ]);

  useEffect(() => {
    if (
      !query.isSuccess ||
      viewCount === 0 ||
      !hasMobileView ||
      isMobileViewAligned ||
      hasMobileAlignAttemptedRef.current ||
      alignMobileViewMutation.isPending
    ) {
      return;
    }

    hasMobileAlignAttemptedRef.current = true;
    alignMobileViewMutation.mutate(query.data ?? []);
  }, [
    alignMobileViewMutation.isPending,
    alignMobileViewMutation.mutate,
    hasMobileView,
    isMobileViewAligned,
    query.data,
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
      ensureMobileViewMutation.isPending ||
      alignMobileViewMutation.isPending ||
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
