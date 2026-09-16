import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  BANNER_CREW_GANTT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_GANTT_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_GANTT_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_GANTT_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: BANNER_CREW_GANTT_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Баннерщики',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: BANNER_CREW_GANTT_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Баннерщики',
      position: 0,
      icon: 'IconCalendarEvent',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: BANNER_CREW_GANTT_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
          title: ' ',
          type: 'FRONT_COMPONENT',
          gridPosition: { row: 0, column: 0, rowSpan: 12, columnSpan: 12 },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              BANNER_CREW_GANTT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
  ],
});
