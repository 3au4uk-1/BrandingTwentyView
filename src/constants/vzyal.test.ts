import { describe, expect, it } from 'vitest';

import { VZYAL, VZYAL_OPTIONS } from './vzyal';

describe('VZYAL_OPTIONS', () => {
  it('lists five people with Russian labels', () => {
    expect(VZYAL.ILYA).toBe('ILYA');
    expect(VZYAL_OPTIONS.map((option) => option.value)).toEqual([
      'ILYA',
      'KIRILL',
      'ANDREY',
      'VASYA',
      'DANYA',
    ]);
    expect(VZYAL_OPTIONS.map((option) => option.label)).toEqual([
      'Илья',
      'Кирилл',
      'Андрей',
      'Вася',
      'Даня',
    ]);
  });

  it('uses the spec colors in order', () => {
    expect(VZYAL_OPTIONS.map((option) => option.color)).toEqual([
      'blue',
      'green',
      'orange',
      'purple',
      'yellow',
    ]);
  });
});
