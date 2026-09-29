import { defineFrontComponent } from 'twenty-sdk/define';

import { PRODUCTION_KANBAN_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';
import { ProductionPage } from 'src/deals-board/production/ProductionPage';

export default defineFrontComponent({
  universalIdentifier: PRODUCTION_KANBAN_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'production-kanban',
  description: 'Канбан производства',
  component: ProductionPage,
});
