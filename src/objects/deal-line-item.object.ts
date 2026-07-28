import {
  defineObject,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { LINE_ITEM_TYPES } from 'src/constants/line-item-types';
import { LINE_ITEM_STAGES } from 'src/constants/stages';
import {
  DEAL_LINE_ITEM_AMOUNT_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_LINE_ITEM_KOLICHESTVO_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_LINE_ITEM_KOMMENTARIY_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_LINE_ITEM_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_LINE_ITEM_PLENKA_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_LINE_ITEM_SSYLKA_NA_MAKETY_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_LINE_ITEM_STAGE_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_LINE_ITEM_TIP_FIELD_UNIVERSAL_IDENTIFIER,
  OPPORTUNITY_DEAL_LINE_ITEMS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

/**
 * Local stub for `dealLineItem` (warehouse-owned on production, same UUID).
 */
export default defineObject({
  universalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'dealLineItem',
  namePlural: 'dealLineItems',
  labelSingular: 'Позиция сделки',
  labelPlural: 'Позиции сделок',
  icon: 'IconListDetails',
  description: 'Позиции сделки (локальный stub / warehouse)',
  fields: [
    {
      universalIdentifier: DEAL_LINE_ITEM_TIP_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'tip',
      type: FieldType.SELECT,
      label: 'Категория',
      icon: 'IconTag',
      options: LINE_ITEM_TYPES.map((type, position) => ({
        value: type.value,
        label: type.label,
        position,
        color: type.color,
      })),
    },
    {
      universalIdentifier: DEAL_LINE_ITEM_STAGE_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'stage',
      type: FieldType.SELECT,
      label: 'Стадия',
      icon: 'IconStatusChange',
      options: LINE_ITEM_STAGES.map((stage, position) => ({
        value: stage.value,
        label: stage.label,
        position,
        color: stage.color,
      })),
    },
    {
      universalIdentifier: DEAL_LINE_ITEM_KOLICHESTVO_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'kolichestvo',
      type: FieldType.NUMBER,
      label: 'Количество',
      icon: 'IconHash',
    },
    {
      universalIdentifier: DEAL_LINE_ITEM_AMOUNT_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'amount',
      type: FieldType.CURRENCY,
      label: 'Сумма',
      icon: 'IconCurrencyRubel',
    },
    {
      universalIdentifier: DEAL_LINE_ITEM_KOMMENTARIY_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'kommentariy',
      type: FieldType.TEXT,
      label: 'Комментарий',
      icon: 'IconMessage',
    },
    {
      universalIdentifier: DEAL_LINE_ITEM_SSYLKA_NA_MAKETY_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'ssylkaNaMakety',
      type: FieldType.LINKS,
      label: 'Ссылка на макеты',
      icon: 'IconLink',
    },
    {
      universalIdentifier: DEAL_LINE_ITEM_PLENKA_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'plenka',
      type: FieldType.RICH_TEXT,
      label: 'Плёнка',
      icon: 'IconNote',
    },
    {
      universalIdentifier: DEAL_LINE_ITEM_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.RELATION,
      name: 'opportunity',
      label: 'Сделка',
      icon: 'IconTargetArrow',
      relationTargetObjectMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
      relationTargetFieldMetadataUniversalIdentifier:
        OPPORTUNITY_DEAL_LINE_ITEMS_FIELD_UNIVERSAL_IDENTIFIER,
      universalSettings: {
        relationType: RelationType.MANY_TO_ONE,
        onDelete: OnDeleteAction.CASCADE,
        joinColumnName: 'opportunityId',
      },
    },
  ],
});
