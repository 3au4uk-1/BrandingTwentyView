export const isEmptyPrintSession = (value: unknown) =>
  value == null || String(value).trim() === '';

export type PrintSendUiState =
  | 'need_datetime'
  | 'ready'
  | 'need_stage'
  | 'sending'
  | 'queued';

export function getPrintSendUiState(input: {
  date: string;
  time: string;
  requested: boolean;
  sessionId: unknown;
  stage: string | null | undefined;
}): PrintSendUiState {
  if (!input.date || !input.time) return 'need_datetime';
  if (!isEmptyPrintSession(input.sessionId)) return 'queued';
  if (input.requested && input.stage !== 'V_PECHATI') return 'need_stage';
  if (input.requested && input.stage === 'V_PECHATI') return 'sending';
  return 'ready';
}

export const PRINT_SEND_HINTS: Record<PrintSendUiState, string> = {
  need_datetime: 'Заполни дату и время',
  ready: '',
  need_stage: 'Поставь стадию «В печати» — уйдёт в таблицу',
  sending: 'Уходит в таблицу…',
  queued: 'В очереди печати',
};
