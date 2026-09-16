import { describe, expect, it } from 'vitest';
import { canMoveToDone } from './telegram-request';

describe('canMoveToDone', () => {
  it('rejects empty reply', () => {
    expect(canMoveToDone('')).toBe(false);
    expect(canMoveToDone('   ')).toBe(false);
    expect(canMoveToDone(null)).toBe(false);
  });

  it('accepts text', () => {
    expect(canMoveToDone('готово, ссылка …')).toBe(true);
  });
});
