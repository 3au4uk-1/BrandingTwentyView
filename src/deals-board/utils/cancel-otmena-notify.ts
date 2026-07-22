type CancelOtmenaHandler = () => void;

let handler: CancelOtmenaHandler | null = null;

export const registerCancelOtmenaHandler = (next: CancelOtmenaHandler | null): void => {
  handler = next;
};

export const notifyDealCancelled = (): void => {
  handler?.();
};
