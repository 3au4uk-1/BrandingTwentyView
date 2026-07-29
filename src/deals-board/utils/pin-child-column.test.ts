import { describe, expect, it } from 'vitest';

import type { ColumnConfig } from '../types';
import { pinChildColumnFirst } from './pin-child-column';

const cols = (fields: string[]): ColumnConfig[] =>
  fields.map((field, order) => ({
    field,
    label: field,
    order,
    visible: field !== 'prevyuOkleyki',
    width: 100,
  }));

describe('pinChildColumnFirst', () => {
  it('moves field to order 0, visible, reindexes rest', () => {
    const result = pinChildColumnFirst(
      cols(['name', 'stage', 'prevyuOkleyki']),
      'prevyuOkleyki',
    );
    expect(result.map((c) => c.field)).toEqual(['prevyuOkleyki', 'name', 'stage']);
    expect(result[0]).toMatchObject({ visible: true, order: 0 });
    expect(result[1].order).toBe(1);
    expect(result[2].order).toBe(2);
  });

  it('no-ops when field absent', () => {
    const input = cols(['name', 'stage']);
    expect(pinChildColumnFirst(input, 'prevyuOkleyki')).toEqual(input);
  });
});
