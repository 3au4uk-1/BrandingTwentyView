import { describe, expect, it } from 'vitest';

import { LINE_ITEM_STAGES, OPPORTUNITY_STAGES } from 'src/constants/stages';

import { FILTER_BUILDER_FIELDS } from './use-filter-clause-editor';

describe('FILTER_BUILDER_FIELDS', () => {
  it('exposes deal stage and line-item stage as separate builder fields', () => {
    const dealStage = FILTER_BUILDER_FIELDS.find(
      (field) => field.level === 'deal' && field.field === 'stage',
    );
    const lineItemStage = FILTER_BUILDER_FIELDS.find(
      (field) => field.level === 'lineItem' && field.field === 'stage',
    );

    expect(dealStage).toMatchObject({
      label: 'Стадия',
      kind: 'multi-select',
      options: OPPORTUNITY_STAGES,
    });
    expect(lineItemStage).toMatchObject({
      label: 'Стадия позиции',
      kind: 'multi-select',
      options: LINE_ITEM_STAGES,
    });
  });

  it('exposes amount as a deal builder field', () => {
    const amount = FILTER_BUILDER_FIELDS.find(
      (field) => field.level === 'deal' && field.field === 'amount',
    );
    expect(amount).toMatchObject({
      label: 'Сумма',
      kind: 'amount',
    });
  });
});
