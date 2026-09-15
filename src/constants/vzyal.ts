export const VZYAL = {
  ILYA: 'ILYA',
  KIRILL: 'KIRILL',
  ANDREY: 'ANDREY',
  VASYA: 'VASYA',
  DANYA: 'DANYA',
} as const;

export type Vzyal = (typeof VZYAL)[keyof typeof VZYAL];

export const VZYAL_OPTIONS = [
  { value: VZYAL.ILYA, label: 'Илья', position: 0, color: 'blue' },
  { value: VZYAL.KIRILL, label: 'Кирилл', position: 1, color: 'green' },
  { value: VZYAL.ANDREY, label: 'Андрей', position: 2, color: 'orange' },
  { value: VZYAL.VASYA, label: 'Вася', position: 3, color: 'purple' },
  { value: VZYAL.DANYA, label: 'Даня', position: 4, color: 'yellow' },
] as const;
