export type DealsBoardSseStage = 'subscribe' | 'register' | 'apply';

export const logDealsBoardSseError = (stage: DealsBoardSseStage, error: unknown): void => {
  console.error(`Deals Board SSE: ${stage}`, error);
};

export const logDealsBoardSseInfo = (stage: DealsBoardSseStage, detail: string): void => {
  console.info(`Deals Board SSE: ${stage} — ${detail}`);
};
