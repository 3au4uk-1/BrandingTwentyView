import { buildXlsxFromRows, XLSX_MIME } from 'src/logic-functions/shared/build-xlsx';

import { getTwentyFunctionsBaseUrl } from '../utils/twenty-functions-base-url';
import {
  buildOkleykaSalaryFilename,
  salaryRowsToXlsxMatrix,
  type OkleykaSalaryRow,
} from './compute';

const readAppAccessToken = (): string | null => {
  const token = globalThis.process?.env?.TWENTY_APP_ACCESS_TOKEN?.trim();
  return token || null;
};

export const resolveOkleykaSalaryExportUrl = (): string | null => {
  const base = getTwentyFunctionsBaseUrl();
  if (!base) return null;
  return `${base.replace(/\/$/, '')}/okleyka-salary-export`;
};

export const buildOkleykaSalaryExcelBlobFromRows = (rows: OkleykaSalaryRow[]): Blob => {
  const bytes = buildXlsxFromRows(salaryRowsToXlsxMatrix(rows));
  // Copy into a plain ArrayBuffer — Remote DOM Blob often rejects SharedArrayBuffer views.
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: XLSX_MIME });
};

export const fetchOkleykaSalaryExcelBlob = async (
  fallbackRows?: OkleykaSalaryRow[],
): Promise<{ blob: Blob; filename: string }> => {
  const filename = buildOkleykaSalaryFilename();
  const url = resolveOkleykaSalaryExportUrl();
  const token = readAppAccessToken();

  if (url && token) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const buffer = await response.arrayBuffer();
        return { blob: new Blob([buffer], { type: XLSX_MIME }), filename };
      }
    } catch {
      // fall through to local build
    }
  }

  if (!fallbackRows) {
    throw new Error('Экспорт не настроен и нет данных для локальной сборки.');
  }
  return { blob: buildOkleykaSalaryExcelBlobFromRows(fallbackRows), filename };
};
