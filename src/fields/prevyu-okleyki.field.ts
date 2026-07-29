import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_PREVYU_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_PREVYU_OKLEYKI_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'prevyuOkleyki',
  type: FieldType.FILES,
  label: 'Превью оклейки',
  icon: 'IconPhoto',
  description: 'Фото визуализации для оклейщиков (1–3 ракурса)',
  universalSettings: {
    maxNumberOfValues: 6,
  },
});
