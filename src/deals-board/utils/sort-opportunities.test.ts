import { describe, expect, it } from 'vitest';

import type { OpportunityRow } from '../types';
import { sortOpportunitiesWithCancelledLast } from './sort-opportunities';

const record = (overrides: Partial<OpportunityRow>): OpportunityRow => ({
  id: overrides.id ?? 'id',
  name: overrides.name ?? 'Deal',
  ...overrides,
});

describe('sortOpportunitiesWithCancelledLast', () => {
  it('places cancelled deals last within the same day', () => {
    const records = sortOpportunitiesWithCancelledLast(
      [
        record({ id: '1', name: 'Отмена', loadDate: '2026-06-29T10:00:00.000Z', stage: 'OTMENA' }),
        record({ id: '2', name: 'Активная', loadDate: '2026-06-29T12:00:00.000Z', stage: 'NOVYY' }),
        record({ id: '3', name: 'Другой день', loadDate: '2026-06-30T09:00:00.000Z', stage: 'NOVYY' }),
      ],
      [{ field: 'loadDate', direction: 'AscNullsFirst' }],
    );

    expect(records.map((row) => row.id)).toEqual(['2', '1', '3']);
  });

  it('keeps cancelled deals last within a day when sorting descending', () => {
    const records = sortOpportunitiesWithCancelledLast(
      [
        record({ id: '1', name: 'Отмена', loadDate: '2026-06-29T10:00:00.000Z', stage: 'OTMENA' }),
        record({ id: '2', name: 'Активная', loadDate: '2026-06-29T12:00:00.000Z', stage: 'NOVYY' }),
        record({ id: '3', name: 'Вчера', loadDate: '2026-06-28T09:00:00.000Z', stage: 'NOVYY' }),
      ],
      [{ field: 'loadDate', direction: 'DescNullsLast' }],
    );

    expect(records.map((row) => row.id)).toEqual(['2', '1', '3']);
  });

  it('does not reorder when sorting by a non-date field', () => {
    const input = [
      record({ id: '1', name: 'B', stage: 'OTMENA' }),
      record({ id: '2', name: 'A', stage: 'NOVYY' }),
    ];

    const records = sortOpportunitiesWithCancelledLast(input, [
      { field: 'name', direction: 'AscNullsFirst' },
    ]);

    expect(records).toBe(input);
  });
});
