import type { ColumnConfig } from 'src/deals-board/types';

/** Fallback column layouts when the metadata API is unavailable. */
export const DEFAULT_PARENT_COLUMNS: ColumnConfig[] = [
  { field: 'name', label: 'Сделка', order: 0, visible: true, width: 320 },
  { field: 'loadDate', label: 'Дата', order: 1, visible: true, width: 100 },
  { field: 'companyName', label: 'Компания', order: 2, visible: true, width: 160 },
  { field: 'summary', label: 'Сводка позиций', order: 3, visible: true, width: 200 },
  { field: 'links', label: 'Ссылки', order: 4, visible: false, width: 80 },
];

export const DEFAULT_CHILD_COLUMNS: ColumnConfig[] = [
  { field: 'name', label: 'Позиция', order: 0, visible: true, width: 240 },
  { field: 'stage', label: 'Стадия', order: 1, visible: true, width: 120 },
  { field: 'ssylkaNaMakety', label: 'Макеты', order: 2, visible: true, width: 100 },
  { field: 'plenka', label: 'Плёнка', order: 3, visible: true, width: 80 },
  { field: 'kolichestvo', label: 'Кол-во', order: 4, visible: true, width: 70 },
  { field: 'amount', label: 'Сумма', order: 5, visible: true, width: 100 },
  { field: 'kommentariy', label: 'Комментарий', order: 6, visible: false, width: 120 },
];
