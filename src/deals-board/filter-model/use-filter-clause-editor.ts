import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { LINE_ITEM_TYPES } from 'src/constants/line-item-types';
import { LINE_ITEM_STAGES } from 'src/constants/stages';

import { fetchCompanyNames } from '../api/companies';
import { useCompanies } from '../hooks/useCompanies';
import { createId } from '../utils/create-id';
import { beginSessionClauses, commitSessionClauses } from './session';
import type { FilterClause, FilterState } from './types';

export type FilterBuilderField = {
  level: FilterClause['level'];
  field: string;
  label: string;
  kind: 'multi-select' | 'company' | 'oplata';
  options?: ReadonlyArray<{ value: string; label: string }>;
};

export const FILTER_BUILDER_FIELDS: FilterBuilderField[] = [
  {
    level: 'lineItem',
    field: 'stage',
    label: 'Стадия',
    kind: 'multi-select',
    options: LINE_ITEM_STAGES,
  },
  {
    level: 'lineItem',
    field: 'tip',
    label: 'Категория',
    kind: 'multi-select',
    options: LINE_ITEM_TYPES,
  },
  {
    level: 'deal',
    field: 'companyId',
    label: 'Компания',
    kind: 'company',
  },
  {
    level: 'deal',
    field: 'oplata',
    label: 'Оплата',
    kind: 'oplata',
    options: [
      { value: 'filled', label: 'Заполнена' },
      { value: 'empty', label: 'Пустая' },
    ],
  },
];

const newClauseId = (): string => createId();

type UseFilterClauseEditorOptions = {
  companySearchEnabled?: boolean;
};

export const useFilterClauseEditor = (
  value: FilterState,
  viewClauses: FilterClause[],
  onChange: (next: FilterState) => void,
  options: UseFilterClauseEditorOptions = {},
) => {
  const { companySearchEnabled = false } = options;
  const [companySearch, setCompanySearch] = useState('');
  const [debouncedCompanySearch, setDebouncedCompanySearch] = useState('');

  const effectiveClauses =
    value.sessionClauses === undefined ? viewClauses : value.sessionClauses;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCompanySearch(companySearch), 250);
    return () => clearTimeout(timer);
  }, [companySearch]);

  const companyClause = effectiveClauses.find(
    (clause) => clause.level === 'deal' && clause.field === 'companyId',
  );
  const selectedCompanyIds = useMemo(
    () =>
      Array.isArray(companyClause?.value)
        ? companyClause.value.filter((id): id is string => typeof id === 'string')
        : [],
    [companyClause?.value],
  );

  const companiesQuery = useCompanies(debouncedCompanySearch, companySearchEnabled);
  const selectedCompanyNamesQuery = useQuery({
    queryKey: ['companyNames', selectedCompanyIds],
    queryFn: () => fetchCompanyNames(selectedCompanyIds),
    enabled: selectedCompanyIds.length > 0,
    staleTime: 60_000,
  });

  const companyNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const company of companiesQuery.data ?? []) {
      map.set(company.id, company.name);
    }
    for (const id of selectedCompanyIds) {
      const name = selectedCompanyNamesQuery.data?.get(id);
      if (name) {
        map.set(id, name);
      }
    }
    return map;
  }, [companiesQuery.data, selectedCompanyIds, selectedCompanyNamesQuery.data]);

  const companyOptions = useMemo(() => {
    const byId = new Map((companiesQuery.data ?? []).map((company) => [company.id, company]));
    for (const id of selectedCompanyIds) {
      if (byId.has(id)) continue;
      const name = selectedCompanyNamesQuery.data?.get(id);
      if (name) {
        byId.set(id, { id, name });
      }
    }
    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name, 'ru'));
  }, [companiesQuery.data, selectedCompanyIds, selectedCompanyNamesQuery.data]);

  const withSessionClauses = (mutator: (clauses: FilterClause[]) => FilterClause[]): void => {
    const base =
      value.sessionClauses === undefined ? beginSessionClauses(viewClauses) : value.sessionClauses;
    onChange({
      ...value,
      sessionClauses: commitSessionClauses(mutator([...base])),
    });
  };

  const upsertClause = (nextClause: FilterClause): void => {
    withSessionClauses((clauses) => {
      const withoutField = clauses.filter(
        (clause) => !(clause.level === nextClause.level && clause.field === nextClause.field),
      );
      return [...withoutField, nextClause];
    });
  };

  const removeClause = (clauseId: string): void => {
    withSessionClauses((clauses) => clauses.filter((clause) => clause.id !== clauseId));
  };

  const toggleMultiValue = (field: FilterBuilderField, optionValue: string): void => {
    const existing = effectiveClauses.find(
      (clause) => clause.level === field.level && clause.field === field.field,
    );
    const currentValues = Array.isArray(existing?.value)
      ? existing.value.filter((item): item is string => typeof item === 'string')
      : [];
    const nextValues = currentValues.includes(optionValue)
      ? currentValues.filter((item) => item !== optionValue)
      : [...currentValues, optionValue];

    if (nextValues.length === 0) {
      if (existing) {
        removeClause(existing.id);
      }
      return;
    }

    upsertClause({
      id: existing?.id ?? newClauseId(),
      level: field.level,
      field: field.field,
      operator: 'in',
      value: nextValues,
    });
  };

  const toggleCompany = (companyId: string): void => {
    toggleMultiValue(
      FILTER_BUILDER_FIELDS.find((field) => field.field === 'companyId')!,
      companyId,
    );
  };

  const setOplata = (oplataValue: 'filled' | 'empty'): void => {
    const existing = effectiveClauses.find(
      (clause) => clause.level === 'deal' && clause.field === 'oplata',
    );
    if (
      existing &&
      existing.operator === (oplataValue === 'empty' ? 'isEmpty' : 'eq') &&
      (oplataValue === 'empty' || existing.value === oplataValue)
    ) {
      removeClause(existing.id);
      return;
    }

    upsertClause({
      id: existing?.id ?? newClauseId(),
      level: 'deal',
      field: 'oplata',
      operator: oplataValue === 'empty' ? 'isEmpty' : 'eq',
      value: oplataValue === 'empty' ? undefined : oplataValue,
    });
  };

  const getSelectedValues = (field: FilterBuilderField): string[] => {
    const existing = effectiveClauses.find(
      (clause) => clause.level === field.level && clause.field === field.field,
    );
    return Array.isArray(existing?.value)
      ? existing.value.filter((item): item is string => typeof item === 'string')
      : [];
  };

  const getOplataValue = (): 'filled' | 'empty' | null => {
    const existing = effectiveClauses.find(
      (clause) => clause.level === 'deal' && clause.field === 'oplata',
    );
    if (!existing) return null;
    if (existing.operator === 'isEmpty') return 'empty';
    if (existing.operator === 'eq' && existing.value === 'filled') return 'filled';
    return null;
  };

  return {
    effectiveClauses,
    companySearch,
    setCompanySearch,
    companyOptions,
    companiesQuery,
    selectedCompanyIds,
    companyNameMap,
    toggleMultiValue,
    toggleCompany,
    setOplata,
    removeClause,
    getSelectedValues,
    getOplataValue,
  };
};
