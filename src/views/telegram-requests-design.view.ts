import { defineView, ViewFilterOperand, ViewType } from 'twenty-sdk/define';
import { TELEGRAM_REQUEST_KIND } from 'src/constants/telegram-request';
import {
  TELEGRAM_REQUEST_KIND_FIELD_UNIVERSAL_IDENTIFIER,
  TELEGRAM_REQUEST_OBJECT_UNIVERSAL_IDENTIFIER,
  TELEGRAM_REQUEST_STAGE_FIELD_UNIVERSAL_IDENTIFIER,
  TELEGRAM_REQUESTS_DESIGN_KIND_FILTER_UNIVERSAL_IDENTIFIER,
  TELEGRAM_REQUESTS_DESIGN_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: TELEGRAM_REQUESTS_DESIGN_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Разработка / проверка',
  objectUniversalIdentifier: TELEGRAM_REQUEST_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconPalette',
  position: 21,
  type: ViewType.KANBAN,
  mainGroupByFieldMetadataUniversalIdentifier: TELEGRAM_REQUEST_STAGE_FIELD_UNIVERSAL_IDENTIFIER,
  filters: [
    {
      universalIdentifier: TELEGRAM_REQUESTS_DESIGN_KIND_FILTER_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: TELEGRAM_REQUEST_KIND_FIELD_UNIVERSAL_IDENTIFIER,
      operand: ViewFilterOperand.IS,
      value: [
        TELEGRAM_REQUEST_KIND.LAYOUT,
        TELEGRAM_REQUEST_KIND.VISUAL,
        TELEGRAM_REQUEST_KIND.REVIEW,
      ],
    },
  ],
});
