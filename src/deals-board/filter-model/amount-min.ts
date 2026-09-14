import { createId } from '../utils/create-id';

import type { FilterClause } from './types';

export const parseAmountMinRub = (raw: string): number | undefined => {
  const trimmed = raw.trim().replace(/\s/g, '').replace(',', '.');
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed < 0) return undefined;
  return parsed;
};

export const rublesToAmountMicros = (rubles: number): number =>
  Math.round(rubles * 1_000_000);

export const formatAmountMinRub = (rubles: number): string =>
  rubles.toLocaleString('ru-RU', { maximumFractionDigits: 2 }).replace(/\p{Zs}/gu, ' ');

export const applyAmountMinToClauses = (
  clauses: FilterClause[],
  raw: string,
): FilterClause[] => {
  const withoutAmount = clauses.filter(
    (clause) => !(clause.level === 'deal' && clause.field === 'amount'),
  );
  const parsed = parseAmountMinRub(raw);
  if (parsed === undefined) return withoutAmount;

  const existing = clauses.find((clause) => clause.level === 'deal' && clause.field === 'amount');
  return [
    ...withoutAmount,
    {
      id: existing?.id ?? createId(),
      level: 'deal',
      field: 'amount',
      operator: 'gte',
      value: parsed,
    },
  ];
};
