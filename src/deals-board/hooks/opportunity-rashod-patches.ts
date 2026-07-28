import { OPPORTUNITY_RASHOD_REST_FIELDS } from 'src/constants/opportunity-rashod-fields';

import type { OpportunityRow } from '../types';

export type OpportunityRashodPatches = Record<string, Partial<OpportunityRow>>;

export const buildOpportunityRashodPatches = (
  rows: OpportunityRow[],
): OpportunityRashodPatches =>
  Object.fromEntries(
    rows.flatMap((row) => {
      const patch: Partial<OpportunityRow> = {};

      for (const field of OPPORTUNITY_RASHOD_REST_FIELDS) {
        if (row[field] !== undefined) {
          patch[field] = row[field];
        }
      }

      return Object.keys(patch).length ? [[row.id, patch]] : [];
    }),
  );

export const mergeOpportunityRashodPatches = (
  opportunities: OpportunityRow[],
  patches?: OpportunityRashodPatches,
): OpportunityRow[] =>
  patches
    ? opportunities.map((opportunity) => {
        const patch = patches[opportunity.id];
        return patch ? { ...opportunity, ...patch } : opportunity;
      })
    : opportunities;
