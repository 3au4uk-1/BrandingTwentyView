import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';

import {
  FIELD_STAFF_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
  FIELD_STAFF_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: FIELD_STAFF_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Выездной персонал',
  icon: 'IconUsers',
  position: 11,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: FIELD_STAFF_INDEX_VIEW_UNIVERSAL_IDENTIFIER,
});
