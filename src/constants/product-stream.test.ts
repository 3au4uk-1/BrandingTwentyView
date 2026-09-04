import { describe, expect, it } from 'vitest';
import {
  filterLineItemsByBoardStream,
  lineItemMatchesBoardStream,
  normalizeProductStreams,
  BOARD_STREAM,
} from './product-stream';

describe('normalizeProductStreams', () => {
  it('treats null and empty as no streams', () => {
    expect(normalizeProductStreams(null)).toEqual([]);
    expect(normalizeProductStreams('')).toEqual([]);
    expect(normalizeProductStreams([])).toEqual([]);
  });
  it('wraps a scalar', () => {
    expect(normalizeProductStreams('DECOR')).toEqual(['DECOR']);
    expect(normalizeProductStreams('BRANDING')).toEqual(['BRANDING']);
  });
  it('sorts MK, DECOR, BRANDING and drops junk', () => {
    expect(normalizeProductStreams(['BRANDING', 'MK', 'NOPE'])).toEqual(['MK', 'BRANDING']);
  });
});

describe('lineItemMatchesBoardStream', () => {
  it('branding board requires BRANDING in the set', () => {
    expect(lineItemMatchesBoardStream(['DECOR', 'BRANDING'], BOARD_STREAM.BRANDING)).toBe(true);
    expect(lineItemMatchesBoardStream(['DECOR'], BOARD_STREAM.BRANDING)).toBe(false);
    expect(lineItemMatchesBoardStream([], BOARD_STREAM.BRANDING)).toBe(false);
  });
  it('decor_mk board requires DECOR or MK', () => {
    expect(lineItemMatchesBoardStream(['DECOR', 'BRANDING'], BOARD_STREAM.DECOR_MK)).toBe(true);
    expect(lineItemMatchesBoardStream(['BRANDING'], BOARD_STREAM.DECOR_MK)).toBe(false);
  });
});

describe('filterLineItemsByBoardStream', () => {
  const mixedItems = [
    { id: '1', productStream: 'BRANDING' },
    { id: '2', productStream: 'DECOR' },
    { id: '3', productStream: ['MK'] },
    { id: '4', productStream: null },
    { id: '5', productStream: ['DECOR', 'BRANDING'] },
  ];

  it('branding board keeps BRANDING membership including intersection; drops null', () => {
    expect(filterLineItemsByBoardStream(mixedItems, BOARD_STREAM.BRANDING).map((i) => i.id)).toEqual([
      '1',
      '5',
    ]);
  });

  it('decor_mk board keeps DECOR, MK, and intersection', () => {
    expect(filterLineItemsByBoardStream(mixedItems, BOARD_STREAM.DECOR_MK).map((i) => i.id)).toEqual([
      '2',
      '3',
      '5',
    ]);
  });
});
