import { describe, expect, it } from 'vitest';

import {
  joinPrintComment,
  parsePrintComment,
  plenkaSnippet,
} from './print-presets';

describe('print-presets', () => {
  it('joins and parses presets with other text', () => {
    const joined = joinPrintComment(
      ['баннер бб с люверсами', 'плоттер'],
      'свой текст',
    );
    expect(joined).toBe('баннер бб с люверсами; плоттер; свой текст');

    const parsed = parsePrintComment(joined);
    expect(parsed.presets).toEqual(['баннер бб с люверсами', 'плоттер']);
    expect(parsed.other).toBe('свой текст');
  });

  it('returns null for empty join', () => {
    expect(joinPrintComment([], '  ')).toBeNull();
  });

  it('builds plenka snippet', () => {
    expect(plenkaSnippet({ markdown: 'Oracal 641\ndetail' })).toBe('Oracal 641');
    expect(plenkaSnippet({ markdown: 'x'.repeat(40) }).endsWith('…')).toBe(true);
  });
});
