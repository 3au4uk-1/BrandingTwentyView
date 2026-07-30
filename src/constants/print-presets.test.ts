import { describe, expect, it } from 'vitest';

import {
  joinPrintComment,
  parsePrintComment,
  plenkaSnippet,
  PRINT_COMMENT_PRESET_GROUPS,
  PRINT_COMMENT_PRESETS,
} from './print-presets';

describe('print-presets', () => {
  it('exposes grouped presets with другое-ready chips', () => {
    expect(PRINT_COMMENT_PRESET_GROUPS.map((group) => group.category)).toEqual([
      'Пленка',
      'Баннер',
      'Плоттер',
    ]);
    expect(PRINT_COMMENT_PRESETS).toHaveLength(5);
    expect(PRINT_COMMENT_PRESETS).toContain('Плоттер с выборкой на монтажке');
  });

  it('joins and parses presets with other text', () => {
    const joined = joinPrintComment(
      [
        'Баннер ББ + ЛЮВЕРСЫ по периметру + резка по формату (кол-во прописано)',
        'Плоттер с выборкой на монтажке',
      ],
      'свой текст',
    );
    expect(joined).toBe(
      'Баннер ББ + ЛЮВЕРСЫ по периметру + резка по формату (кол-во прописано); Плоттер с выборкой на монтажке; свой текст',
    );

    const parsed = parsePrintComment(joined);
    expect(parsed.presets).toEqual([
      'Баннер ББ + ЛЮВЕРСЫ по периметру + резка по формату (кол-во прописано)',
      'Плоттер с выборкой на монтажке',
    ]);
    expect(parsed.other).toBe('свой текст');
  });

  it('treats unknown legacy presets as other text', () => {
    const parsed = parsePrintComment('баннер бб с люверсами; плоттер');
    expect(parsed.presets).toEqual([]);
    expect(parsed.other).toBe('баннер бб с люверсами; плоттер');
  });

  it('returns null for empty join', () => {
    expect(joinPrintComment([], '  ')).toBeNull();
  });

  it('builds plenka snippet', () => {
    expect(plenkaSnippet({ markdown: 'Oracal 641\ndetail' })).toBe('Oracal 641');
    expect(plenkaSnippet({ markdown: 'x'.repeat(40) }).endsWith('…')).toBe(true);
  });
});
