import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  BANNER_CREW_GANTT_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  BANNER_CREW_GANTT_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: BANNER_CREW_GANTT_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Баннерщики',
  icon: 'IconCalendarEvent',
  position: 1,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: BANNER_CREW_GANTT_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
});
