import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  PRODUCTION_KANBAN_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  PRODUCTION_KANBAN_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
  PRODUCTION_KANBAN_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  PRODUCTION_KANBAN_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: PRODUCTION_KANBAN_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Производство',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: PRODUCTION_KANBAN_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Производство',
      position: 0,
      icon: 'IconTool',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: PRODUCTION_KANBAN_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
          title: ' ',
          type: 'FRONT_COMPONENT',
          gridPosition: { row: 0, column: 0, rowSpan: 12, columnSpan: 12 },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              PRODUCTION_KANBAN_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
  ],
});
