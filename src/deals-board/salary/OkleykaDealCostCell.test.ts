import { describe, expect, it } from 'vitest';

import { okleykaRubForSave } from './OkleykaDealCostCell';

describe('okleykaRubForSave', () => {
  it('treats zero as null', () => {
    expect(okleykaRubForSave(0)).toBeNull();
  });

  it('keeps positive rubles', () => {
    expect(okleykaRubForSave(1500)).toBe(1500);
  });

  it('keeps null', () => {
    expect(okleykaRubForSave(null)).toBeNull();
  });
});
