import { defineObject, FieldType } from 'twenty-sdk/define';
import {
  DEAL_BOARD_VIEW_CHILD_COLUMNS_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_BOARD_VIEW_FILTERS_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_BOARD_VIEW_IS_DEFAULT_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_BOARD_VIEW_OBJECT_UNIVERSAL_IDENTIFIER,
  DEAL_BOARD_VIEW_PARENT_COLUMNS_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_BOARD_VIEW_SORT_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_BOARD_VIEW_VISIBILITY_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export { DEAL_BOARD_VIEW_OBJECT_UNIVERSAL_IDENTIFIER };

export default defineObject({
  universalIdentifier: DEAL_BOARD_VIEW_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'dealBoardView',
  namePlural: 'dealBoardViews',
  labelSingular: 'View реализации',
  labelPlural: 'Views реализации',
  icon: 'IconTable',
  fields: [
    {
      universalIdentifier: DEAL_BOARD_VIEW_VISIBILITY_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'visibility',
      type: FieldType.SELECT,
      label: 'Видимость',
      options: [
        { value: 'personal', label: 'Личный', position: 0, color: 'blue' },
        { value: 'workspace', label: 'Общий', position: 1, color: 'green' },
      ],
    },
    {
      universalIdentifier: DEAL_BOARD_VIEW_PARENT_COLUMNS_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'parentColumns',
      type: FieldType.RAW_JSON,
      label: 'Колонки сделок',
    },
    {
      universalIdentifier: DEAL_BOARD_VIEW_CHILD_COLUMNS_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'childColumns',
      type: FieldType.RAW_JSON,
      label: 'Колонки позиций',
    },
    {
      universalIdentifier: DEAL_BOARD_VIEW_FILTERS_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'filters',
      type: FieldType.RAW_JSON,
      label: 'Фильтры',
    },
    {
      universalIdentifier: DEAL_BOARD_VIEW_SORT_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'sort',
      type: FieldType.RAW_JSON,
      label: 'Сортировка',
    },
    {
      universalIdentifier: DEAL_BOARD_VIEW_IS_DEFAULT_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'isDefault',
      type: FieldType.BOOLEAN,
      label: 'По умолчанию',
      defaultValue: false,
    },
  ],
});
