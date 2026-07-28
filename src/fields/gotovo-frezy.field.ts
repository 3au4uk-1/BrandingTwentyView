import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_GOTOVO_FREZY_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_GOTOVO_FREZY_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'gotovoFrezy',
  type: FieldType.BOOLEAN,
  label: 'Фреза · Готово',
  icon: 'IconCheck',
  description: 'Readback с листа фрезы, колонки V',
});
