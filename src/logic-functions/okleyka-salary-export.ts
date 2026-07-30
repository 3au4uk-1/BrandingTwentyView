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
import { buildXlsxFromRows } from './shared/build-xlsx';

/**
 * Returns JSON `{ filename, contentBase64 }` — Twenty LOCAL LF serializes
 * `Buffer`/`Uint8Array` Response bodies as `{"type":"Buffer","data":[...]}`,
 * which is not a valid xlsx when saved by the browser.
 */
const handler = async () => {
  try {
    const lineItems = await fetchOkleykaSalaryLineItems();
    const opportunityIds = [...new Set(lineItems.map((item) => item.opportunityId))];
    const deals = await fetchOpportunitiesByIdsForSalary(opportunityIds);
    const dealsById = new Map(deals.map((deal) => [deal.id, deal]));
    const rows = buildOkleykaSalaryRows(lineItems, dealsById);
    const bytes = buildXlsxFromRows(salaryRowsToXlsxMatrix(rows));
    const filename = buildOkleykaSalaryFilename();
    const contentBase64 = Buffer.from(bytes).toString('base64');

    return new Response(JSON.stringify({ ok: true, filename, contentBase64 }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
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
