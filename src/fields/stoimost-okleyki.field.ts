import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_STOIMOST_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

/** Wrapping labor cost per position; not yet part of rashodItogo. */
export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_STOIMOST_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'stoimostOkleyki',
  type: FieldType.CURRENCY,
  label: 'Стоимость оклейки',
  icon: 'IconCurrencyRubel',
  description:
    'Расход на оклейку по позиции (зеркало «Расход: выездная команда»; пока не входит в rashodItogo)',
});
