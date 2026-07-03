export const LINE_ITEM_STAGES = [
  { value: 'NOVYY', label: 'Новый', color: 'white' },
  { value: 'V_RABOTE', label: 'В работе', color: 'orange' },
  { value: 'V_PECHATI', label: 'В печати', color: 'yellow' },
  { value: 'OKLEYKA', label: 'Оклейка', color: 'blue' },
  { value: 'GOTOVO', label: 'Готово', color: 'green' },
  { value: 'RESTAVRACIYA', label: 'Реставрация', color: 'purple' },
  { value: 'OTMENA', label: 'Отмена', color: 'red' },
] as const;

export const OPPORTUNITY_STAGES = [
  { value: 'NOVYY', label: 'Новый', color: 'white' },
  { value: 'V_RABOTE', label: 'В работе', color: 'orange' },
  { value: 'GOTOVO', label: 'Готово', color: 'green' },
  { value: 'OTCHET_STAS', label: 'Отчёт Стас', color: 'greenDark' },
  { value: 'DUBL', label: 'ДУБЛЬ', color: 'yellow' },
  { value: 'OTMENA', label: 'Отмена', color: 'red' },
] as const;

export type LineItemStage = (typeof LINE_ITEM_STAGES)[number]['value'];
export type OpportunityStage = (typeof OPPORTUNITY_STAGES)[number]['value'];

export const DONE_STAGES: LineItemStage[] = ['GOTOVO', 'OTMENA'];

export const LINE_ITEM_STAGE_ORDER: LineItemStage[] = LINE_ITEM_STAGES.map((s) => s.value);

const findStage = (
  stages: ReadonlyArray<{ value: string; label: string; color: string }>,
  value: string,
) => stages.find((s) => s.value === value);

export const getStageLabel = (value: string): string =>
  findStage(LINE_ITEM_STAGES, value)?.label ?? value;

export const getStageColor = (value: string): string =>
  findStage(LINE_ITEM_STAGES, value)?.color ?? 'gray';

export const getOpportunityStageLabel = (value: string): string =>
  findStage(OPPORTUNITY_STAGES, value)?.label ?? getStageLabel(value);

export const getOpportunityStageColor = (value: string): string =>
  findStage(OPPORTUNITY_STAGES, value)?.color ?? getStageColor(value);
