import { defineField, defineObject, FieldType } from 'twenty-sdk/define';

export const DEAL_BOARD_VIEW_OBJECT_UNIVERSAL_IDENTIFIER =
  'c3d4e5f6-a7b8-9012-cdef-345678901234';

export default defineObject({
  universalIdentifier: DEAL_BOARD_VIEW_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'dealBoardView',
  namePlural: 'dealBoardViews',
  labelSingular: 'View реализации',
  labelPlural: 'Views реализации',
  icon: 'IconTable',
  fields: [
    defineField({
      universalIdentifier: 'd4e5f6a7-b8c9-0123-defa-456789012301',
      name: 'visibility',
      type: FieldType.SELECT,
      label: 'Видимость',
      options: [
        { value: 'personal', label: 'Личный', position: 0, color: 'blue' },
        { value: 'workspace', label: 'Общий', position: 1, color: 'green' },
      ],
    }),
    defineField({
      universalIdentifier: 'd4e5f6a7-b8c9-0123-defa-456789012302',
      name: 'parentColumns',
      type: FieldType.RAW_JSON,
      label: 'Колонки сделок',
    }),
    defineField({
      universalIdentifier: 'd4e5f6a7-b8c9-0123-defa-456789012303',
      name: 'childColumns',
      type: FieldType.RAW_JSON,
      label: 'Колонки позиций',
    }),
    defineField({
      universalIdentifier: 'd4e5f6a7-b8c9-0123-defa-456789012304',
      name: 'filters',
      type: FieldType.RAW_JSON,
      label: 'Фильтры',
    }),
    defineField({
      universalIdentifier: 'd4e5f6a7-b8c9-0123-defa-456789012305',
      name: 'sort',
      type: FieldType.RAW_JSON,
      label: 'Сортировка',
    }),
    defineField({
      universalIdentifier: 'd4e5f6a7-b8c9-0123-defa-456789012306',
      name: 'isDefault',
      type: FieldType.BOOLEAN,
      label: 'По умолчанию',
      defaultValue: false,
    }),
  ],
});
