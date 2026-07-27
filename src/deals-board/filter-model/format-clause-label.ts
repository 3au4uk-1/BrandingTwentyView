import { getLineItemTypeLabel } from 'src/constants/line-item-types';
import { getStageLabel } from 'src/constants/stages';

import type { FilterClause } from './types';

const OPLATA_LABELS: Record<string, string> = {
  filled: 'Заполнена',
  empty: 'Пустая',
};

const FIELD_LABELS: Record<string, string> = {
  stage: 'Стадия',
  tip: 'Категория',
  companyId: 'Компания',
  oplata: 'Оплата',
};

const formatValueList = (
  values: unknown,
  labelForValue: (value: string) => string,
): string => {
  const list = Array.isArray(values) ? values.filter((value): value is string => typeof value === 'string') : [];
  if (list.length === 0) {
    return '';
  }
  return list.map(labelForValue).join(', ');
};

export const formatFilterClauseLabel = (
  clause: FilterClause,
  companyNames?: ReadonlyMap<string, string>,
): string => {
  const fieldLabel = FIELD_LABELS[clause.field] ?? clause.field;

  if (clause.field === 'stage') {
    return `${fieldLabel}: ${formatValueList(clause.value, getStageLabel)}`;
  }

  if (clause.field === 'tip') {
    return `${fieldLabel}: ${formatValueList(clause.value, getLineItemTypeLabel)}`;
  }

  if (clause.field === 'companyId') {
    const ids = Array.isArray(clause.value)
      ? clause.value.filter((value): value is string => typeof value === 'string')
      : [];
    const names = ids.map((id) => companyNames?.get(id) ?? id);
    return `${fieldLabel}: ${names.join(', ')}`;
  }

  if (clause.field === 'oplata') {
    if (clause.operator === 'isEmpty') {
      return `${fieldLabel}: ${OPLATA_LABELS.empty}`;
    }
    if (typeof clause.value === 'string') {
      return `${fieldLabel}: ${OPLATA_LABELS[clause.value] ?? clause.value}`;
    }
  }

  return fieldLabel;
};
