import type { ColumnConfig, ColumnGroupConfig } from 'src/deals-board/types';
import { PRINT_FIELD_GROUP_ID } from './print-field-group';

/** Fallback column layouts when the metadata API is unavailable. */
export const DEFAULT_PARENT_COLUMNS: ColumnConfig[] = [
  { field: 'name', label: 'Сделка', order: 0, visible: true, width: 300 },
  { field: 'vzyal', label: 'Взял', order: 1, visible: true, width: 110 },
  { field: 'stage', label: 'Стадия', order: 2, visible: true, width: 148 },
  { field: 'loadDate', label: 'Дата', order: 3, visible: true, width: 220 },
  { field: 'companyName', label: 'Компания', order: 4, visible: true, width: 160 },
  { field: 'summary', label: 'Сводка позиций', order: 5, visible: true, width: 200 },
  { field: 'links', label: 'Ссылки', order: 6, visible: false, width: 80 },
];

export const DEFAULT_CHILD_GROUPS: ColumnGroupConfig[] = [
  { id: PRINT_FIELD_GROUP_ID, name: 'Печать Плёнки', order: 0 },
];

export const DEFAULT_CHILD_COLUMNS: ColumnConfig[] = [
  { field: 'prevyuOkleyki', label: 'Превью', order: 0, visible: true, width: 72 },
  { field: 'name', label: 'Позиция', order: 1, visible: true, width: 240 },
  { field: 'tip', label: 'Категория', order: 2, visible: true, width: 120 },
  { field: 'stage', label: 'Стадия', order: 3, visible: true, width: 120 },
  { field: 'tipDetail', label: 'Уточнение', order: 4, visible: true, width: 140 },
  {
    field: 'ssylkaNaMakety',
    label: 'Макеты',
    order: 5,
    visible: true,
    width: 100,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  {
    field: 'dataGotovnostiPechati',
    label: 'Дата готовности печати',
    order: 6,
    visible: true,
    width: 120,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  {
    field: 'vremyaGotovnostiPechati',
    label: 'Время готовности печати',
    order: 7,
    visible: true,
    width: 110,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  {
    field: 'kommentariyDlyaPechati',
    label: 'Комментарий для печати',
    order: 8,
    visible: true,
    width: 160,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  {
    field: 'plenka',
    label: 'Плёнка',
    order: 9,
    visible: true,
    width: 80,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  {
    field: 'vzatoVRabotu',
    label: 'Взято в работу',
    order: 10,
    visible: true,
    width: 110,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  {
    field: 'gotovo',
    label: 'Готово',
    order: 11,
    visible: true,
    width: 90,
    groupId: PRINT_FIELD_GROUP_ID,
  },
  { field: 'kolichestvo', label: 'Кол-во', order: 12, visible: true, width: 70 },
  { field: 'amount', label: 'Сумма', order: 13, visible: true, width: 100 },
  { field: 'kommentariy', label: 'Комментарий', order: 14, visible: false, width: 120 },
  {
    field: 'zatratyNaRabotu',
    label: 'Затраты на работу',
    order: 15,
    visible: true,
    width: 140,
  },
];
