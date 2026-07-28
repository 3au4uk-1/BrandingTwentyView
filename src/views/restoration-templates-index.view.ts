import { defineView, ViewKey } from 'twenty-sdk/define';
import {
  RESTORATION_TEMPLATE_IS_DEFAULT_FIELD_UNIVERSAL_IDENTIFIER,
  RESTORATION_TEMPLATE_MAKET_URL_FIELD_UNIVERSAL_IDENTIFIER,
  RESTORATION_TEMPLATE_MATCH_KEYWORDS_FIELD_UNIVERSAL_IDENTIFIER,
  RESTORATION_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  RESTORATION_TEMPLATE_PRIORITY_FIELD_UNIVERSAL_IDENTIFIER,
  RESTORATION_TEMPLATES_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineView({
  universalIdentifier: RESTORATION_TEMPLATES_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Все шаблоны реставрации',
  objectUniversalIdentifier: RESTORATION_TEMPLATE_OBJECT_UNIVERSAL_IDENTIFIER,
  icon: 'IconList',
  key: ViewKey.INDEX,
  position: 0,
  fields: [
    {
      universalIdentifier: '0170f00c-421a-4383-89a1-9e33f19784e3',
      fieldMetadataUniversalIdentifier:
        RESTORATION_TEMPLATE_MATCH_KEYWORDS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: '563524c1-2836-4282-b7f0-e2f8bee6a784',
      fieldMetadataUniversalIdentifier:
        RESTORATION_TEMPLATE_PRIORITY_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 100,
    },
    {
      universalIdentifier: '896d0212-092d-4896-933b-926f17cb8298',
      fieldMetadataUniversalIdentifier:
        RESTORATION_TEMPLATE_IS_DEFAULT_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 120,
    },
    {
      universalIdentifier: '9c2e1f0a-4b5c-4d6e-8f70-a1b2c3d4e5f6',
      fieldMetadataUniversalIdentifier:
        RESTORATION_TEMPLATE_MAKET_URL_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 200,
    },
  ],
});
