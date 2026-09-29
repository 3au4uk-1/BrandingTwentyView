import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  PRODUCTION_KANBAN_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  PRODUCTION_KANBAN_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: PRODUCTION_KANBAN_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Производство',
  icon: 'IconTool',
  position: 2,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: PRODUCTION_KANBAN_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
});
