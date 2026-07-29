import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  OKLEYKA_SALARY_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  OKLEYKA_SALARY_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: OKLEYKA_SALARY_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Оклейщики',
  icon: 'IconUsers',
  position: 0,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: OKLEYKA_SALARY_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
});
