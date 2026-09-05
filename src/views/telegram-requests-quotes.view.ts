import { defineView, ViewFilterOperand, ViewType } from 'twenty-sdk/define';
import { TELEGRAM_REQUEST_KIND } from 'src/constants/telegram-request';
import {
  TELEGRAM_REQUEST_KIND_FIELD_UNIVERSAL_IDENTIFIER,
  TELEGRAM_REQUEST_OBJECT_UNIVERSAL_IDENTIFIER,
  TELEGRAM_REQUEST_STAGE_FIELD_UNIVERSAL_IDENTIFIER,
  TELEGRAM_REQUESTS_QUOTES_KIND_FILTER_UNIVERSAL_IDENTIFIER,
  TELEGRAM_REQUESTS_QUOTES_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: TELEGRAM_REQUESTS_QUOTES_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Просчёты',
  objectUniversalIdentifier: TELEGRAM_REQUEST_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconCalculator',
  position: 20,
  type: ViewType.KANBAN,
  mainGroupByFieldMetadataUniversalIdentifier: TELEGRAM_REQUEST_STAGE_FIELD_UNIVERSAL_IDENTIFIER,
  filters: [
    {
      universalIdentifier: TELEGRAM_REQUESTS_QUOTES_KIND_FILTER_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: TELEGRAM_REQUEST_KIND_FIELD_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: [TELEGRAM_REQUEST_KIND.QUOTE],
    },
  ],
});
