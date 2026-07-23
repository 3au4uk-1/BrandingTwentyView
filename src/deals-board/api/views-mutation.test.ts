import { describe, expect, it } from 'vitest';

import { serializeViewMutationData } from './views';

const sampleColumns = [{ field: 'name', label: 'Позиция', order: 0, visible: true }];
const sampleGroups = [{ id: 'g1', name: 'Печать', order: 0 }];

describe('serializeViewMutationData', () => {
  it('passes through partial updates without childColumns', () => {
    expect(
      serializeViewMutationData({
        filters: { showAll: true },
      }),
    ).toEqual({ filters: { showAll: true } });
  });

  it('preserves groups when childColumns and childGroups are both provided', () => {
    const payload = serializeViewMutationData({
      childColumns: sampleColumns,
      childGroups: sampleGroups,
    });

    expect(payload.childColumns).toEqual({
      version: 2,
      columns: sampleColumns,
      groups: sampleGroups,
    });
  });

  it('defaults groups to [] when childColumns is provided without childGroups', () => {
    const payload = serializeViewMutationData({
      childColumns: sampleColumns,
    });

    expect(payload.childColumns?.groups).toEqual([]);
  });
});
