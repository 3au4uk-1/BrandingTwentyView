import { defineField, FieldType } from 'twenty-sdk/define';

import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { DEAL_LINE_ITEM_STAGE_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { LINE_ITEM_STAGES } from 'src/constants/stages';

/** Registers dealLineItem + stage in the app schema (field synced in workspace). */
export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_STAGE_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'stage',
  type: FieldType.SELECT,
  label: 'Стадия',
  icon: 'IconStatusChange',
  options: LINE_ITEM_STAGES.map((stage, index) => ({
    value: stage.value,
    label: stage.label,
    position: index,
    color: stage.color,
  })),
});
