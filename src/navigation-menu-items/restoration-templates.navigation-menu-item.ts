import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  RESTORATION_TEMPLATES_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  RESTORATION_TEMPLATES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: RESTORATION_TEMPLATES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Шаблоны реставрации',
  icon: 'IconPhoto',
  position: 12,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: RESTORATION_TEMPLATES_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
});
