import { describe, expect, it } from 'vitest';

import {
  resolveSelectDisplayValue,
  selectValueToPatch,
} from './select-cell-value';

describe('resolveSelectDisplayValue', () => {
  it('maps null/undefined to empty string', () => {
    expect(resolveSelectDisplayValue(null)).toBe('');
    expect(resolveSelectDisplayValue(undefined)).toBe('');
  });

  it('keeps real values', () => {
    expect(resolveSelectDisplayValue('OKLEYKA')).toBe('OKLEYKA');
  });
});

describe('selectValueToPatch', () => {
  it('maps empty to null', () => {
    expect(selectValueToPatch('')).toBeNull();
  });

  it('passes through option values', () => {
    expect(selectValueToPatch('OKLEYKA')).toBe('OKLEYKA');
  });
});
