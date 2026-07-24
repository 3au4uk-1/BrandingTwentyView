type OkleykaMessageHandler = (message: string) => void;

let handler: OkleykaMessageHandler | null = null;

export const registerOkleykaMessageHandler = (
  next: OkleykaMessageHandler | null,
): void => {
  handler = next;
};

export const notifyOkleykaMessage = (message: string): void => {
  handler?.(message);
};
