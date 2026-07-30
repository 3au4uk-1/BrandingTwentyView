import { describe, expect, it } from 'vitest';

import {
  countDealsByPrefix,
  formatPrefixCountsTitle,
  parseDealPrefix,
  type DealPrefix,
} from './deal-prefix';

const emptyCounts = (): Record<DealPrefix, number> => ({
  PRO: 0,
  ARENDA: 0,
  ART: 0,
  BIRZHA: 0,
  BS: 0,
  OTHER: 0,
});

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

describe('formatPrefixCountsTitle', () => {
  it('returns empty string when all prefix counts are zero', () => {
    expect(formatPrefixCountsTitle(emptyCounts())).toBe('');
  });

  it('joins only positive counts in DEAL_PREFIX_ORDER with labels', () => {
    const counts = emptyCounts();
    counts.PRO = 15;
    counts.ARENDA = 15;
    counts.ART = 12;
    counts.BIRZHA = 5;
    expect(formatPrefixCountsTitle(counts)).toBe(
      'ПРО 15 Аренда 15 АРТ 12 Биржа лидов 5',
    );
  });

  it('skips zero counts and ignores OTHER', () => {
    const counts = emptyCounts();
    counts.ART = 2;
    counts.OTHER = 99;
    expect(formatPrefixCountsTitle(counts)).toBe('АРТ 2');
  });
});
