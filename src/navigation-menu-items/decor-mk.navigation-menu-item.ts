import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  DECOR_MK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  DECOR_MK_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: DECOR_MK_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'МК и Декор',
  icon: 'IconPalette',
  position: 1,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: DECOR_MK_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
});
