import { defineFrontComponent } from 'twenty-sdk/define';

import { DecorMkBoardPage } from 'src/front-components/DecorMkBoardPage';
import { DECOR_MK_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineFrontComponent({
  universalIdentifier: DECOR_MK_BOARD_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'decor-mk-board',
  description: 'МК и Декор',
  component: DecorMkBoardPage,
});
