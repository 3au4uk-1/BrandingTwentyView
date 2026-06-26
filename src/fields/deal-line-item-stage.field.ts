import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { LINE_ITEM_STAGES } from 'src/constants/stages';

export default defineField({
  universalIdentifier: 'b1c2d3e4-f5a6-7890-abcd-ef1234567001',
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'stage',
  type: FieldType.SELECT,
  label: 'Стадия',
  icon: 'IconStatusChange',
  options: LINE_ITEM_STAGES.map((s, i) => ({
    value: s.value,
    label: s.label,
    position: i,
    color: s.color,
  })),
});
