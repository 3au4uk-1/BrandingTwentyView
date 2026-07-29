import { describe, expect, it } from 'vitest';

import {
  appendUnknownCrmTipDetails,
  mergeAppOptionsWithCrmLabels,
} from './merge-crm-labels';

describe('mergeAppOptionsWithCrmLabels', () => {
  it('keeps app options when CRM is empty', () => {
    const app = [{ value: 'PLENKA', label: 'Плёнка', color: 'blue' }] as const;
    expect(mergeAppOptionsWithCrmLabels(app, [])).toEqual([...app]);
  });

  it('overrides labels from CRM by value', () => {
    const app = [{ value: 'PLENKA', label: 'Плёнка', color: 'blue' }] as const;
    const merged = mergeAppOptionsWithCrmLabels(app, [
      { value: 'PLENKA', label: 'Пленка (CRM)' },
    ]);
    expect(merged[0]).toEqual({
      value: 'PLENKA',
      label: 'Пленка (CRM)',
      color: 'blue',
    });
  });
});

describe('appendUnknownCrmTipDetails', () => {
  it('appends current CRM-only value so the row stays editable', () => {
    const app = [{ value: 'NASHI', label: 'Наши', color: 'green' }];
    const result = appendUnknownCrmTipDetails(
      app,
      [{ value: 'OTDAT_SKLAD', label: 'отдать на склад' }],
      'OTDAT_SKLAD',
    );
    expect(result.map((o) => o.value)).toEqual(['NASHI', 'OTDAT_SKLAD']);
  });
});
