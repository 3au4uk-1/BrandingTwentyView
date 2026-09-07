import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import {
  BANNER_CREW_SLOT_OBJECT_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_SLOT_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  OPPORTUNITY_BANNER_CREW_SLOTS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_BANNER_CREW_SLOTS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'bannerCrewSlots',
  label: 'Слоты баннерщиков',
  icon: 'IconCalendarEvent',
  relationTargetObjectMetadataUniversalIdentifier: BANNER_CREW_SLOT_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    BANNER_CREW_SLOT_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
