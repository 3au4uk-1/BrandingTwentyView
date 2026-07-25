import type { ColumnConfig, ColumnGroupConfig } from 'src/deals-board/types';
import { PRINT_FIELD_GROUP_ID } from './print-field-group';

/** Fallback column layouts when the metadata API is unavailable. */
export const DEFAULT_PARENT_COLUMNS: ColumnConfig[] = [
  { field: 'name', label: 'Сделка', order: 0, visible: true, width: 300 },
  { field: 'stage', label: 'Стадия', order: 1, visible: true, width: 148 },
  { field: 'loadDate', label: 'Дата', order: 2, visible: true, width: 100 },
  { field: 'companyName', label: 'Компания', order: 3, visible: true, width: 160 },
  { field: 'summary', label: 'Сводка позиций', order: 4, visible: true, width: 200 },
  { field: 'links', label: 'Ссылки', order: 5, visible: false, width: 80 },
];

export const DEFAULT_CHILD_GROUPS: ColumnGroupConfig[] = [
  { id: PRINT_FIELD_GROUP_ID, name: 'Печать', order: 0 },
];

export const DEFAULT_CHILD_COLUMNS: ColumnConfig[] = [
  { field: 'name', label: 'Позиция', order: 0, visible: true, width: 240 },
  { field: 'tip', label: 'Тип', order: 1, visible: true, width: 120 },
  { field: 'stage', label: 'Стадия', order: 2, visible: true, width: 120 },
  { field: 'tipDetail', label: 'Уточнение', order: 3, visible: true, width: 140 },
  {
    field: 'ssylkaNaMakety',
    label: 'Макеты',
    order: 4,
    visible: true,
    width: 100,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  {
    field: 'dataGotovnostiPechati',
    label: 'Дата готовности печати',
    order: 5,
    visible: true,
    width: 120,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  {
    field: 'vremyaGotovnostiPechati',
    label: 'Время готовности печати',
    order: 6,
    visible: true,
    width: 110,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  {
    field: 'kommentariyDlyaPechati',
    label: 'Комментарий для печати',
    order: 7,
    visible: true,
    width: 160,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  {
    field: 'plenka',
    label: 'Плёнка',
    order: 8,
    visible: true,
    width: 80,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  {
    field: 'vzatoVRabotu',
    label: 'Взято в работу',
    order: 9,
    visible: true,
    width: 110,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  {
    field: 'gotovo',
    label: 'Готово',
    order: 10,
    visible: true,
    width: 90,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  { field: 'kolichestvo', label: 'Кол-во', order: 11, visible: true, width: 70 },
  { field: 'amount', label: 'Сумма', order: 12, visible: true, width: 100 },
  { field: 'kommentariy', label: 'Комментарий', order: 13, visible: false, width: 120 },
  {
    field: 'zatratyNaRabotu',
    label: 'Затраты на работу',
    order: 14,
    visible: true,
    width: 140,
  },
];
