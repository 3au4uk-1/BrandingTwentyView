import { describe, expect, it } from 'vitest';

import { EMPTY_VALUE } from '../theme/tokens';

import { formatReadOnlyValue } from './format-read-only-value';

describe('formatReadOnlyValue', () => {
  it('formats currency amount objects', () => {
    expect(
      formatReadOnlyValue('CURRENCY', {
        amountMicros: 1_500_000,
        currencyCode: 'RUB',
      }),
    ).toContain('1');
    expect(
      formatReadOnlyValue('CURRENCY', {
        amountMicros: 1_500_000,
        currencyCode: 'RUB',
      }),
    ).toContain('RUB');
  });

  it('returns EMPTY_VALUE for missing currency', () => {
    expect(formatReadOnlyValue('CURRENCY', null)).toBe(EMPTY_VALUE);
    expect(formatReadOnlyValue('CURRENCY', {})).toBe(EMPTY_VALUE);
  });

  it('formats link primary url', () => {
    expect(
      formatReadOnlyValue('LINKS', { primaryLinkUrl: 'https://example.com' }),
    ).toBe('https://example.com');
  });

  it('returns EMPTY_VALUE for missing link url', () => {
    expect(formatReadOnlyValue('LINKS', {})).toBe(EMPTY_VALUE);
  });

  it('formats rich text markdown truncated', () => {
    const longMarkdown = `# Title\n\n${'word '.repeat(50)}`;
    const formatted = formatReadOnlyValue('RICH_TEXT', { markdown: longMarkdown });
    expect(formatted.length).toBeLessThan(longMarkdown.length);
    expect(formatted).not.toContain('#');
  });

  it('formats plain string rich text', () => {
    expect(formatReadOnlyValue('RICH_TEXT', 'Hello world')).toBe('Hello world');
  });

  it('formats relation by name', () => {
    expect(formatReadOnlyValue('RELATION', { id: 'abc', name: 'Acme Corp' })).toBe('Acme Corp');
  });

  it('formats relation by id when name missing', () => {
    expect(formatReadOnlyValue('RELATION', { id: 'abc-123' })).toBe('abc-123');
  });

  it('formats boolean as Да/Нет', () => {
    expect(formatReadOnlyValue('BOOLEAN', true)).toBe('Да');
    expect(formatReadOnlyValue('BOOLEAN', false)).toBe('Нет');
  });

  it('formats DATE with ru-RU short date', () => {
    const formatted = formatReadOnlyValue('DATE', '2024-03-15');
    expect(formatted).toMatch(/15/);
    expect(formatted).toMatch(/03/);
    expect(formatted).toMatch(/2024/);
  });

  it('formats DATE_TIME with ru-RU short date', () => {
    const formatted = formatReadOnlyValue('DATE_TIME', '2024-03-15T10:30:00.000Z');
    expect(formatted).toMatch(/15/);
    expect(formatted).not.toBe(EMPTY_VALUE);
  });

  it('returns EMPTY_VALUE for invalid date', () => {
    expect(formatReadOnlyValue('DATE', 'not-a-date')).toBe(EMPTY_VALUE);
  });

  it('falls back to string for primitives', () => {
    expect(formatReadOnlyValue(undefined, 'hello')).toBe('hello');
    expect(formatReadOnlyValue('TEXT', 42)).toBe('42');
  });

  it('returns EMPTY_VALUE for nullish fallback', () => {
    expect(formatReadOnlyValue(undefined, null)).toBe(EMPTY_VALUE);
    expect(formatReadOnlyValue(undefined, undefined)).toBe(EMPTY_VALUE);
  });
});
