export type ManualSyncErrorPayload = {
  lineItemId: string;
  opportunityId: string;
  message: string;
  retry: () => Promise<void>;
};

type Handler = (payload: ManualSyncErrorPayload) => void;
let handler: Handler | null = null;

export const registerManualSyncErrorHandler = (next: Handler | null) => {
  handler = next;
};

export const notifyManualSyncError = (payload: ManualSyncErrorPayload) => {
  handler?.(payload);
};
