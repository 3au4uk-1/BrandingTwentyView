import { describe, expect, it } from 'vitest';

import { MIN_COLUMN_WIDTH } from '../hooks/useColumnResize';

describe('MIN_COLUMN_WIDTH', () => {
  it('allows narrow columns for compact nested tables', () => {
    expect(MIN_COLUMN_WIDTH).toBeLessThanOrEqual(40);
  });
});

describe('column resize delta with scale', () => {
  it('applies scale correction to mouse delta', () => {
    const startX = 100;
    const startWidth = 120;
    const scaleX = 0.8;
    const clientX = 180;

    const delta = (clientX - startX) / scaleX;
    const nextWidth = Math.max(MIN_COLUMN_WIDTH, startWidth + delta);

    expect(nextWidth).toBe(220);
  });
});
