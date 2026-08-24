import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
  SUPPLIERS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: SUPPLIERS_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Поставщики',
  icon: 'IconTruck',
  position: 10,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: SUPPLIER_OBJECT_UNIVERSAL_IDENTIFIER,
});
