import { defineFrontComponent } from 'twenty-sdk/define';

import { DealsBoard } from 'src/deals-board/DealsBoard';

import {
  APP_DISPLAY_NAME,
  DEALS_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineFrontComponent({
  universalIdentifier: DEALS_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'deals-board',
  description: `${APP_DISPLAY_NAME} — плоская таблица сделок · сводка смены · тип/уточнение`,
  component: DealsBoard,
});
