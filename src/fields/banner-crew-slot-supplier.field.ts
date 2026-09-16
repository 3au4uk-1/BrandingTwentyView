import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
} from 'twenty-sdk/define';
import {
  BANNER_CREW_SLOT_OBJECT_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_SLOT_SUPPLIER_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_BANNER_CREW_SLOTS_FIELD_UNIVERSAL_IDENTIFIER,
  SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: BANNER_CREW_SLOT_SUPPLIER_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: BANNER_CREW_SLOT_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'supplier',
  label: 'Поставщик',
  icon: 'IconTruck',
  isNullable: true,
  relationTargetObjectMetadataUniversalIdentifier: SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    SUPPLIER_BANNER_CREW_SLOTS_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'supplierId',
  },
});
