import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import {
  TELEGRAM_REQUESTS_DESIGN_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  TELEGRAM_REQUESTS_DESIGN_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: TELEGRAM_REQUESTS_DESIGN_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Разработка / проверка',
  icon: 'IconPalette',
  position: 21,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: TELEGRAM_REQUESTS_DESIGN_VIEW_UNIVERSAL_IDENTIFIER,
});
