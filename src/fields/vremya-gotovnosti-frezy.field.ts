import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_VREMYA_GOTOVNOSTI_FREZY_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_VREMYA_GOTOVNOSTI_FREZY_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'vremyaGotovnostiFrezy',
  type: FieldType.TEXT,
  label: 'Время готовности фрезы',
  icon: 'IconClock',
  description: 'HH:MM, шаг 10 мин',
});
