import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';
import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import {
  DEAL_LINE_ITEM_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  OPPORTUNITY_DEAL_LINE_ITEMS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_DEAL_LINE_ITEMS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.opportunity.universalIdentifier,
  type: FieldType.RELATION,
  name: 'dealLineItems',
  label: '╨Я╨╛╨╖╨╕╤Ж╨╕╨╕ ╤Б╨┤╨╡╨╗╨║╨╕',
  icon: 'IconListDetails',
  relationTargetObjectMetadataUniversalIdentifier:
    DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    DEAL_LINE_ITEM_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
