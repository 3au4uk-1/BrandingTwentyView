import { defineView, ViewKey } from 'twenty-sdk/define';
import {
  BANNER_CREW_SLOT_ENDS_AT_FIELD_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_SLOT_LOCATION_FIELD_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_SLOT_OBJECT_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_SLOT_STARTS_AT_FIELD_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_SLOTS_INDEX_ENDS_VIEW_FIELD,
  BANNER_CREW_SLOTS_INDEX_LOCATION_VIEW_FIELD,
  BANNER_CREW_SLOTS_INDEX_STARTS_VIEW_FIELD,
  BANNER_CREW_SLOTS_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: BANNER_CREW_SLOTS_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Все слоты баннерщиков',
  objectUniversalIdentifier: BANNER_CREW_SLOT_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconList',
  key: ViewKey.INDEX,
  position: 0,
  fields: [
    {
      universalIdentifier: BANNER_CREW_SLOTS_INDEX_LOCATION_VIEW_FIELD,
      fieldMetadataUniversalIdentifier: BANNER_CREW_SLOT_LOCATION_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: BANNER_CREW_SLOTS_INDEX_STARTS_VIEW_FIELD,
      fieldMetadataUniversalIdentifier: BANNER_CREW_SLOT_STARTS_AT_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: BANNER_CREW_SLOTS_INDEX_ENDS_VIEW_FIELD,
      fieldMetadataUniversalIdentifier: BANNER_CREW_SLOT_ENDS_AT_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 160,
    },
  ],
});
