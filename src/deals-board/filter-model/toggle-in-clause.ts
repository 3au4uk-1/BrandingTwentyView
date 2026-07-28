import { createId } from '../utils/create-id';
import type { FilterClause } from './types';

const newClauseId = (): string => createId();

/** Toggle a string value inside an `in` clause for the given level/field. */
export const toggleInClauseValue = (
  clauses: FilterClause[],
  level: FilterClause['level'],
  field: string,
  optionValue: string,
): FilterClause[] => {
  const existing = clauses.find(
    (clause) => clause.level === level && clause.field === field && clause.operator === 'in',
  );
  const currentValues = Array.isArray(existing?.value)
    ? existing.value.filter((item): item is string => typeof item === 'string')
    : [];
  const nextValues = currentValues.includes(optionValue)
    ? currentValues.filter((item) => item !== optionValue)
    : [...currentValues, optionValue];

  const withoutField = clauses.filter(
    (clause) => !(clause.level === level && clause.field === field),
  );

  if (nextValues.length === 0) {
    return withoutField;
  }

  return [
    ...withoutField,
    {
      id: existing?.id ?? newClauseId(),
      level,
      field,
      operator: 'in',
      value: nextValues,
    },
  ];
};
