import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import {
  BANNER_CREW_SLOT_OBJECT_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_SLOT_SUPPLIER_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_BANNER_CREW_SLOTS_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: SUPPLIER_BANNER_CREW_SLOTS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'bannerCrewSlotItems',
  label: 'Слоты баннерщиков',
  icon: 'IconCalendarEvent',
  relationTargetObjectMetadataUniversalIdentifier: BANNER_CREW_SLOT_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    BANNER_CREW_SLOT_SUPPLIER_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
