import {
  defineNavigationMenuItem,
  NavigationMenuItemType,
} from 'twenty-sdk/define';
import {
  TELEGRAM_REQUESTS_QUOTES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  TELEGRAM_REQUESTS_QUOTES_VIEW_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineNavigationMenuItem({
  universalIdentifier: TELEGRAM_REQUESTS_QUOTES_NAVIGATION_MENU_ITEM_UNIVERSAL_IDENTIFIER,
  name: 'Просчёты',
  icon: 'IconCalculator',
  position: 20,
  type: NavigationMenuItemType.VIEW,
  viewUniversalIdentifier: TELEGRAM_REQUESTS_QUOTES_VIEW_UNIVERSAL_IDENTIFIER,
});
