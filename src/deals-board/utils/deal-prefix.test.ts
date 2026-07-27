import { describe, expect, it } from 'vitest';

import { countDealsByPrefix, parseDealPrefix } from './deal-prefix';

describe('parseDealPrefix', () => {
  it('maps known prefixes', () => {
    expect(parseDealPrefix('ПРО/10.07/Acme')).toBe('PRO');
    expect(parseDealPrefix('АРЕНДА/шатёр')).toBe('ARENDA');
    expect(parseDealPrefix('АРТ/баннер')).toBe('ART');
    expect(parseDealPrefix('Биржа/лот')).toBe('BIRZHA');
    expect(parseDealPrefix('БС/заказ')).toBe('BS');
    expect(parseDealPrefix('БС что-то')).toBe('BS');
  });

  it('returns OTHER for unknown names', () => {
    expect(parseDealPrefix('просто сделка')).toBe('OTHER');
    expect(parseDealPrefix('')).toBe('OTHER');
  });
});

describe('countDealsByPrefix', () => {
  it('counts distinct deals per prefix', () => {
    const counts = countDealsByPrefix([
      { id: '1', name: 'ПРО/a' },
      { id: '1', name: 'ПРО/a' },
      { id: '2', name: 'АРТ/b' },
      { id: '3', name: 'БС/c' },
      { id: '4', name: 'other' },
    ]);

    expect(counts.PRO).toBe(1);
    expect(counts.ART).toBe(1);
    expect(counts.BS).toBe(1);
    expect(counts.OTHER).toBe(1);
    expect(counts.ARENDA).toBe(0);
  });
});
