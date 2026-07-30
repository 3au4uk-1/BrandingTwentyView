import { zipStore } from './simple-zip';

const encodeUtf8 = (text: string): Uint8Array => new TextEncoder().encode(text);

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/** Excel A1 column letters for 0-based index (supports >26). */
export const excelColumnName = (index: number): string => {
  let n = index + 1;
  let name = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
};

export type XlsxCell = string | number | null | undefined;

const cellXml = (row: number, col: number, value: XlsxCell): string => {
  const ref = `${excelColumnName(col)}${row}`;
  if (value == null || value === '') {
    return `<c r="${ref}"/>`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}" t="n"><v>${value}</v></c>`;
  }
  return `<c r="${ref}" t="inlineStr"><is><t>${escapeXml(String(value))}</t></is></c>`;
};

export const buildSheetXml = (rows: XlsxCell[][]): string => {
  const sheetRows = rows
    .map((row, rowIndex) => {
      const r = rowIndex + 1;
      const cells = row.map((value, colIndex) => cellXml(r, colIndex, value)).join('');
      return `<row r="${r}">${cells}</row>`;
    })
    .join('');

  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${sheetRows}</sheetData>` +
    `</worksheet>`
  );
};

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Оклейщики" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`;

const WORKBOOK_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`;

export const buildXlsxFromRows = (rows: XlsxCell[][]): Uint8Array =>
  zipStore([
    { path: '[Content_Types].xml', data: encodeUtf8(CONTENT_TYPES) },
    { path: '_rels/.rels', data: encodeUtf8(ROOT_RELS) },
    { path: 'xl/workbook.xml', data: encodeUtf8(WORKBOOK) },
    { path: 'xl/_rels/workbook.xml.rels', data: encodeUtf8(WORKBOOK_RELS) },
    { path: 'xl/worksheets/sheet1.xml', data: encodeUtf8(buildSheetXml(rows)) },
  ]);

export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
