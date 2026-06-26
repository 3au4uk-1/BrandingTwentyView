export const LINE_ITEM_STAGES = [
  { value: 'NOVYY', label: 'Новый', color: 'blue' },
  { value: 'V_RABOTE', label: 'В работе', color: 'purple' },
  { value: 'V_PECHATI', label: 'В печати', color: 'orange' },
  { value: 'OKLEYKA', label: 'Оклейка', color: 'yellow' },
  { value: 'GOTOVO', label: 'Готово', color: 'green' },
  { value: 'RESTAVRACIYA', label: 'Реставрация', color: 'pink' },
  { value: 'OTMENA', label: 'Отмена', color: 'red' },
] as const;

export type LineItemStage = (typeof LINE_ITEM_STAGES)[number]['value'];

export const DONE_STAGES: LineItemStage[] = ['GOTOVO', 'OTMENA'];

export const getStageLabel = (value: string): string =>
  LINE_ITEM_STAGES.find((s) => s.value === value)?.label ?? value;

export const getStageColor = (value: string): string =>
  LINE_ITEM_STAGES.find((s) => s.value === value)?.color ?? 'gray';
