import type { LineItemRow, OpportunityRow } from '../types';

import { notifyOkleykaMessage } from './okleyka-message-notify';

export const openOkleykaDialogForLineItem = (
  opportunity: OpportunityRow,
  lineItem: LineItemRow,
): void => {
  notifyOkleykaMessage({
    opportunityId: opportunity.id,
    lineItemId: lineItem.id,
    opportunity: {
      id: opportunity.id,
      name: opportunity.name,
      loadDate: opportunity.loadDate,
    },
    lineItem,
  });
};
