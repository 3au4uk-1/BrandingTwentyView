import { defineView, ViewKey } from 'twenty-sdk/define';

import { DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/constants/crm-objects';
import {
  DEAL_LINE_ITEM_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  DEAL_LINE_ITEM_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  DEAL_LINE_ITEM_VIEW_NAME_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

/** Registers dealLineItem in the app schema without re-owning warehouse fields. */
export default defineView({
  universalIdentifier: DEAL_LINE_ITEM_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Позиции для реализации',
  objectUniversalIdentifier: DEAL_LINE_ITEM_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconListDetails',
  key: ViewKey.INDEX,
  position: 0,
  fields: [
    {
      universalIdentifier: DEAL_LINE_ITEM_VIEW_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      fieldMetadataUniversalIdentifier: DEAL_LINE_ITEM_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 240,
    },
  ],
});
