import { getLineItemTypeLabel } from 'src/constants/line-item-types';
import { getOpportunityStageLabel, getStageLabel } from 'src/constants/stages';

import { formatAmountMinRub } from './amount-min';
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
  amount: 'Сумма',
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
    const stageFieldLabel = clause.level === 'lineItem' ? 'Стадия позиции' : 'Стадия';
    const labelForValue = clause.level === 'deal' ? getOpportunityStageLabel : getStageLabel;
    return `${stageFieldLabel}: ${formatValueList(clause.value, labelForValue)}`;
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

  if (clause.field === 'amount' && clause.operator === 'gte' && typeof clause.value === 'number') {
    return `${fieldLabel}: от ${formatAmountMinRub(clause.value)}`;
  }

  return fieldLabel;
};
