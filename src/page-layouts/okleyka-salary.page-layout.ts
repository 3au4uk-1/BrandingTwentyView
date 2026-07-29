import { definePageLayout, PageLayoutTabLayoutMode } from 'twenty-sdk/define';

import {
  OKLEYKA_SALARY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default definePageLayout({
  universalIdentifier: OKLEYKA_SALARY_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Оклейщики',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: OKLEYKA_SALARY_PAGE_LAYOUT_TAB_UNIVERSAL_IDENTIFIER,
      title: 'Оклейщики',
      position: 0,
      icon: 'IconUsers',
      layoutMode: PageLayoutTabLayoutMode.CANVAS,
      widgets: [
        {
          universalIdentifier: OKLEYKA_SALARY_PAGE_WIDGET_UNIVERSAL_IDENTIFIER,
          title: ' ',
          type: 'FRONT_COMPONENT',
          gridPosition: { row: 0, column: 0, rowSpan: 12, columnSpan: 12 },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              OKLEYKA_SALARY_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
  ],
});
