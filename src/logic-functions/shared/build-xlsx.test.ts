import { describe, expect, it, vi } from 'vitest';

import { crc32, zipStore } from './simple-zip';
import { buildSheetXml, buildXlsxFromRows, excelColumnName } from './build-xlsx';

describe('simple-zip', () => {
  it('builds a zip with PK signatures', () => {
    const data = new TextEncoder().encode('hello');
    const zip = zipStore([{ path: 'hello.txt', data }]);
    expect(zip[0]).toBe(0x50); // P
    expect(zip[1]).toBe(0x4b); // K
    expect(crc32(data)).toBeGreaterThan(0);
  });
});

describe('build-xlsx', () => {
  it('maps column indexes to Excel letters', () => {
    expect(excelColumnName(0)).toBe('A');
    expect(excelColumnName(25)).toBe('Z');
    expect(excelColumnName(26)).toBe('AA');
  });

  it('emits inline strings and numbers in sheet xml', () => {
    const xml = buildSheetXml([
      ['Bitrix', 'Кол-во'],
      ['https://x', 2],
    ]);
    expect(xml).toContain('inlineStr');
    expect(xml).toContain('<v>2</v>');
    expect(xml).toContain('Bitrix');
  });

  it('builds xlsx bytes starting with ZIP local header', () => {
    const bytes = buildXlsxFromRows([['A'], [1]]);
    expect(bytes.byteLength).toBeGreaterThan(100);
    expect(String.fromCharCode(bytes[0]!, bytes[1]!)).toBe('PK');
  });
});
