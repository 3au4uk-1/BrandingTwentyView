import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_VZATO_V_RABOTU_FREZY_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_VZATO_V_RABOTU_FREZY_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'vzatoVRabotuFrezy',
  type: FieldType.BOOLEAN,
  label: 'Фреза · Взято в работу',
  icon: 'IconPlayerPlay',
  description: 'Readback с листа фрезы, колонки U',
});
