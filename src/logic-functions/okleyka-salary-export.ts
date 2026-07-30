import { defineLogicFunction } from 'twenty-sdk/define';
import { Response } from 'twenty-sdk/logic-function';

import { OKLEYKA_SALARY_EXPORT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import {
  buildOkleykaSalaryFilename,
  buildOkleykaSalaryRows,
  salaryRowsToXlsxMatrix,
} from 'src/deals-board/salary/compute';
import {
  fetchOkleykaSalaryLineItems,
  fetchOpportunitiesByIdsForSalary,
} from 'src/deals-board/salary/api';
import { buildXlsxFromRows, XLSX_MIME } from './shared/build-xlsx';

const handler = async () => {
  try {
    const lineItems = await fetchOkleykaSalaryLineItems();
    const opportunityIds = [...new Set(lineItems.map((item) => item.opportunityId))];
    const deals = await fetchOpportunitiesByIdsForSalary(opportunityIds);
    const dealsById = new Map(deals.map((deal) => [deal.id, deal]));
    const rows = buildOkleykaSalaryRows(lineItems, dealsById);
    const bytes = buildXlsxFromRows(salaryRowsToXlsxMatrix(rows));
    const filename = buildOkleykaSalaryFilename();
    // Node Response accepts Buffer; Uint8Array may be wrapped inconsistently.
    const body = Buffer.from(bytes);

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': XLSX_MIME,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Export failed';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
};

export default defineLogicFunction({
  universalIdentifier: OKLEYKA_SALARY_EXPORT_LOGIC_FUNCTION_UNIVERSAL_IDENTIFIER,
  name: 'okleyka-salary-export',
  timeoutSeconds: 60,
  handler,
  httpRouteTriggerSettings: {
    path: '/okleyka-salary-export',
    httpMethod: 'GET',
    isAuthRequired: true,
  },
});
