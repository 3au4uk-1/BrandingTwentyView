import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import { OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import {
  BANNER_CREW_SLOT_OBJECT_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_SLOT_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  OPPORTUNITY_BANNER_CREW_SLOTS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: BANNER_CREW_SLOT_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: BANNER_CREW_SLOT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'opportunity',
  label: 'Сделка',
  icon: 'IconTargetArrow',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    OPPORTUNITY_BANNER_CREW_SLOTS_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'opportunityId',
  },
});
