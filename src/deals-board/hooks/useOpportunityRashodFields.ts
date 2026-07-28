import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { OPPORTUNITY_RASHOD_REST_FIELDS } from 'src/constants/opportunity-rashod-fields';

import { enrichOpportunityRowsWithRestFields } from '../api/opportunity-link-fields-rest';
import type { OpportunityRow } from '../types';
import {
  buildOpportunityRashodPatches,
  mergeOpportunityRashodPatches,
} from './opportunity-rashod-patches';
import { buildOpportunityRashodQueryKey } from './opportunity-rashod-query-key';

export const useOpportunityRashodFields = (
  opportunities: OpportunityRow[],
  enabled = true,
) => {
  const ids = useMemo(
    () => opportunities.map((opportunity) => opportunity.id),
    [opportunities],
  );

  const query = useQuery({
    queryKey: buildOpportunityRashodQueryKey(ids),
    queryFn: async () =>
      buildOpportunityRashodPatches(
        await enrichOpportunityRowsWithRestFields(
          opportunities,
          OPPORTUNITY_RASHOD_REST_FIELDS,
        ),
      ),
    enabled: enabled && ids.length > 0,
    staleTime: 30_000,
  });

  return {
    opportunities: mergeOpportunityRashodPatches(opportunities, query.data),
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  };
};
