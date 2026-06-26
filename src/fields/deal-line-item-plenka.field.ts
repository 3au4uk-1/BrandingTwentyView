import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';

export default defineField({
  universalIdentifier: 'b1c2d3e4-f5a6-7890-abcd-ef1234567003',
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'plenka',
  type: FieldType.RICH_TEXT,
  label: 'Плёнка',
  icon: 'IconFileText',
});
