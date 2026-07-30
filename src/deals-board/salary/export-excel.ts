import { buildXlsxFromRows, XLSX_MIME } from 'src/logic-functions/shared/build-xlsx';

import {
  buildOkleykaSalaryFilename,
  salaryRowsToXlsxMatrix,
  type OkleykaSalaryRow,
} from './compute';

export const buildOkleykaSalaryExcelBlobFromRows = (rows: OkleykaSalaryRow[]): Blob => {
  const bytes = buildXlsxFromRows(salaryRowsToXlsxMatrix(rows));
  // Copy into a plain ArrayBuffer — Remote DOM Blob often rejects SharedArrayBuffer views.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: XLSX_MIME });
};

/**
 * Build Excel from the caller's filtered rows (source of truth).
 * LF okleyka-salary-export is skipped — it loads unfiltered history without date params.
 */
export const fetchOkleykaSalaryExcelBlob = async (
  rows: OkleykaSalaryRow[],
): Promise<{ blob: Blob; filename: string }> => {
  const filename = buildOkleykaSalaryFilename();
  if (!rows.length) {
    throw new Error('Нет строк для экспорта.');
  }
  return { blob: buildOkleykaSalaryExcelBlobFromRows(rows), filename };
};
