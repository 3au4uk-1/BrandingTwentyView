import { defineField, FieldType, RelationType } from 'twenty-sdk/define';
import { OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import {
  OPPORTUNITY_TELEGRAM_REQUESTS_FIELD_UNIVERSAL_IDENTIFIER,
  TELEGRAM_REQUEST_OBJECT_UNIVERSAL_IDENTIFIER,
  TELEGRAM_REQUEST_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineField({
  universalIdentifier: OPPORTUNITY_TELEGRAM_REQUESTS_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: OPPORTUNITY_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'telegramRequests',
  label: 'Заявки бота',
  icon: 'IconRobot',
  relationTargetObjectMetadataUniversalIdentifier: TELEGRAM_REQUEST_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    TELEGRAM_REQUEST_OPPORTUNITY_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
