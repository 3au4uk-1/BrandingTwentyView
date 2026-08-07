export type DealsBoardSseStage = 'subscribe' | 'register' | 'apply';

export const logDealsBoardSseError = (stage: DealsBoardSseStage, error: unknown): void => {
  console.error(`Deals Board SSE: ${stage}`, error);
};
