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

const decodeBase64ToBlob = (base64: string, mime: string): Blob => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes.buffer], { type: mime });
};

/**
 * Prefer client-side OOXML from already-loaded rows.
 * Optional LF returns JSON `{ filename, contentBase64 }` (binary Response is
 * serialized as `{"type":"Buffer","data":[...]}` and corrupts the file).
 */
export const fetchOkleykaSalaryExcelBlob = async (
  rows: OkleykaSalaryRow[],
): Promise<{ blob: Blob; filename: string }> => {
  const filename = buildOkleykaSalaryFilename();
  if (!rows.length) {
    throw new Error('Нет строк для экспорта.');
  }

  // Local build is the source of truth — avoids corrupt Buffer JSON from LF.
  const local = buildOkleykaSalaryExcelBlobFromRows(rows);

  const url = resolveOkleykaSalaryExportUrl();
  const token = readAppAccessToken();
  if (!url || !token) {
    return { blob: local, filename };
  }

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    });
    if (!response.ok) {
      return { blob: local, filename };
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('application/json')) {
      // Legacy/binary path is unsafe in Twenty LOCAL LF — ignore.
      return { blob: local, filename };
    }
    const body = (await response.json()) as {
      filename?: string;
      contentBase64?: string;
      error?: string;
    };
    if (typeof body.contentBase64 === 'string' && body.contentBase64.length > 0) {
      return {
        blob: decodeBase64ToBlob(body.contentBase64, XLSX_MIME),
        filename:
          typeof body.filename === 'string' && body.filename.trim()
            ? body.filename.trim()
            : filename,
      };
    }
  } catch {
    // fall through
  }

  return { blob: local, filename };
};
