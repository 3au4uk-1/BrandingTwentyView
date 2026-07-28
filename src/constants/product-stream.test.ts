import { describe, expect, it } from 'vitest';
import {
  filterLineItemsByBoardStream,
  lineItemMatchesBoardStream,
  normalizeProductStream,
  BOARD_STREAM,
} from './product-stream';

describe('normalizeProductStream', () => {
  it('maps empty to BRANDING', () => {
    expect(normalizeProductStream(null)).toBe('BRANDING');
    expect(normalizeProductStream('')).toBe('BRANDING');
  });
  it('keeps DECOR and MK', () => {
    expect(normalizeProductStream('DECOR')).toBe('DECOR');
    expect(normalizeProductStream('MK')).toBe('MK');
  });
});

describe('lineItemMatchesBoardStream', () => {
  it('branding board keeps BRANDING only', () => {
    expect(lineItemMatchesBoardStream('BRANDING', BOARD_STREAM.BRANDING)).toBe(true);
    expect(lineItemMatchesBoardStream('DECOR', BOARD_STREAM.BRANDING)).toBe(false);
  });
  it('decor_mk board keeps DECOR and MK', () => {
    expect(lineItemMatchesBoardStream('DECOR', BOARD_STREAM.DECOR_MK)).toBe(true);
    expect(lineItemMatchesBoardStream('MK', BOARD_STREAM.DECOR_MK)).toBe(true);
    expect(lineItemMatchesBoardStream('BRANDING', BOARD_STREAM.DECOR_MK)).toBe(false);
  });
});

describe('filterLineItemsByBoardStream', () => {
  const mixedItems = [
    { id: '1', productStream: 'BRANDING' },
    { id: '2', productStream: 'DECOR' },
    { id: '3', productStream: 'MK' },
    { id: '4', productStream: null },
  ];

  it('branding board keeps only BRANDING rows', () => {
    expect(filterLineItemsByBoardStream(mixedItems, BOARD_STREAM.BRANDING)).toEqual([
      { id: '1', productStream: 'BRANDING' },
      { id: '4', productStream: null },
    ]);
  });

  it('decor_mk board keeps DECOR and MK rows', () => {
    expect(filterLineItemsByBoardStream(mixedItems, BOARD_STREAM.DECOR_MK)).toEqual([
      { id: '2', productStream: 'DECOR' },
      { id: '3', productStream: 'MK' },
    ]);
  });
});
