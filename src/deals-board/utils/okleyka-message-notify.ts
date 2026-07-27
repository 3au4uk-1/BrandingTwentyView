import type { LineItemRow, OpportunityRow } from '../types';

export type OkleykaNotifyPayload = {
  opportunityId: string;
  lineItemId: string;
  opportunity: Pick<OpportunityRow, 'id' | 'name' | 'loadDate'>;
  lineItem: LineItemRow;
};

type OkleykaMessageHandler = (payload: OkleykaNotifyPayload) => void;

let handler: OkleykaMessageHandler | null = null;

export const registerOkleykaMessageHandler = (
  next: OkleykaMessageHandler | null,
): void => {
  handler = next;
};

export const notifyOkleykaMessage = (payload: OkleykaNotifyPayload): void => {
  handler?.(payload);
};
