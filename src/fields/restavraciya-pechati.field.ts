import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_RESTAVRATSIYA_PECHATI_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_RESTAVRATSIYA_PECHATI_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'restavraciyaPechati',
  type: FieldType.BOOLEAN,
  label: 'Реставрация (печать)',
  icon: 'IconCheckbox',
  description: 'Галочка реставрации → колонка F листа печати; readback из Excel',
});
