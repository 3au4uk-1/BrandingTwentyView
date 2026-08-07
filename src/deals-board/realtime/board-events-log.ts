export type DealsBoardEventsStage = 'poll' | 'apply';

export const logDealsBoardEventsError = (stage: DealsBoardEventsStage, error: unknown): void => {
  console.error(`Deals Board events: ${stage}`, error);
};

export const logDealsBoardEventsInfo = (stage: DealsBoardEventsStage, detail: string): void => {
  console.info(`Deals Board events: ${stage} — ${detail}`);
};
