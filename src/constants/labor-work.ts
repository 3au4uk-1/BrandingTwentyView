export const LABOR_WORK = {
  OKLEYKA: 'OKLEYKA',
  PODRYADNAYA_OKLEYKA: 'PODRYADNAYA_OKLEYKA',
} as const;

export type LaborWork = (typeof LABOR_WORK)[keyof typeof LABOR_WORK];

export const LABOR_WORK_OPTIONS = [
  { value: LABOR_WORK.OKLEYKA, label: 'Оклейка', position: 0, color: 'blue' },
  {
    value: LABOR_WORK.PODRYADNAYA_OKLEYKA,
    label: 'Подрядная оклейка',
    position: 1,
    color: 'purple',
  },
] as const;
