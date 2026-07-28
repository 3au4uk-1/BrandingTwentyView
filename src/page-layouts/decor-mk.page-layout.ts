import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  DECOR_MK_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  DECOR_MK_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
  DECOR_MK_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  DECOR_MK_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: DECOR_MK_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'МК и Декор',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: DECOR_MK_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
      title: 'МК и Декор',
      position: 0,
      icon: 'IconPalette',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: DECOR_MK_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
          title: ' ',
          type: 'FRONT_COMPONENT',
          gridPosition: { row: 0, column: 0, rowSpan: 12, columnSpan: 12 },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              DECOR_MK_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
  ],
});
