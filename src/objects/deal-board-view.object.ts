import { defineObject, FieldType } from 'twenty-sdk/define';
import { BOARD_KIND } from 'src/constants/product-stream';
import {
  DEAL_BOARD_VIEW_BOARD_KIND_FIELD_UNIVERSAL_IDENTIFIER,
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
        { value: 'PERSONAL', label: 'Личный', position: 0, color: 'blue' },
        { value: 'WORKSPACE', label: 'Общий', position: 1, color: 'green' },
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
    {
      universalIdentifier: DEAL_BOARD_VIEW_BOARD_KIND_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'boardKind',
      type: FieldType.SELECT,
      label: 'Тип доски',
      defaultValue: `'${BOARD_KIND.REALIZACIYA}'`,
      options: [
        { value: BOARD_KIND.REALIZACIYA, label: 'Реализация', position: 0, color: 'blue' },
        { value: BOARD_KIND.DECOR_MK, label: 'МК и Декор', position: 1, color: 'purple' },
      ],
    },
  ],
});
