import { buildXlsxFromRows, XLSX_MIME } from 'src/logic-functions/shared/build-xlsx';

import {
  buildOkleykaSalaryFilename,
  dealGroupsToXlsxMatrix,
  type OkleykaDealGroup,
} from './compute';

export const buildOkleykaSalaryExcelBlobFromGroups = (groups: OkleykaDealGroup[]): Blob => {
  const bytes = buildXlsxFromRows(dealGroupsToXlsxMatrix(groups));
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy.buffer], { type: XLSX_MIME });
};

export const fetchOkleykaSalaryExcelBlob = async (
  groups: OkleykaDealGroup[],
): Promise<{ blob: Blob; filename: string }> => {
  if (!groups.length) throw new Error('Нет строк для экспорта.');
  return { blob: buildOkleykaSalaryExcelBlobFromGroups(groups), filename: buildOkleykaSalaryFilename() };
};
