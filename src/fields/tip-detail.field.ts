import { defineField, FieldType } from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import { TIP_DETAIL_OPTIONS } from 'src/constants/tip-detail';
import { DEAL_LINE_ITEM_TIP_DETAIL_FIELD_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: DEAL_LINE_ITEM_TIP_DETAIL_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  name: 'tipDetail',
  type: FieldType.SELECT,
  label: 'Уточнение',
  icon: 'IconListDetails',
  options: TIP_DETAIL_OPTIONS.map((option, position) => ({
    value: option.value,
    label: option.label,
    position,
    color: option.color,
  })),
});
