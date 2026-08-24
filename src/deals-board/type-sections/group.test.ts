import { describe, expect, it } from 'vitest';
import { buildTypeSectionRows } from './group';

describe('buildTypeSectionRows', () => {
  it('keeps relative order inside a section', () => {
    const items = [
      { id: 'b2', tip: 'BANNERA' },
      { id: 'p1', tip: 'PLENKA' },
      { id: 'b1', tip: 'BANNERA' },
    ];
    const rows = buildTypeSectionRows(items);
    expect(rows.map((row) => (row.kind === 'separator' ? row.label : row.item.id))).toEqual([
      'Плёнка',
      'p1',
      'Баннера',
      'b2',
      'b1',
    ]);
  });

  it('omits empty sections', () => {
    const rows = buildTypeSectionRows([{ id: '1', tip: 'PODRYAD' }]);
    expect(rows.filter((row) => row.kind === 'separator').map((row) => row.label)).toEqual([
      'Подряд',
    ]);
  });

  it('splits не наше and unknown when both exist', () => {
    const rows = buildTypeSectionRows([
      { id: 'u', tip: null },
      { id: 'n', tip: 'NE_NASHE' },
    ]);
    expect(rows.filter((r) => r.kind === 'separator').map((r) => r.label)).toEqual([
      'Не наше',
      'Без типа',
    ]);
  });
});
