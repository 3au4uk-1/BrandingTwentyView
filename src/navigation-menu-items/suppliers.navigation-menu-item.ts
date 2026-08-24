import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  SUPPLIERS_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  SUPPLIERS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: SUPPLIERS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Поставщики',
  icon: 'IconTruck',
  position: 10,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: SUPPLIERS_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
});
