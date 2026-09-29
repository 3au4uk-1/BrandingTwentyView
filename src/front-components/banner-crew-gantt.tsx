import { defineFrontComponent } from 'twenty-sdk/define';

import { BannerCrewPage } from 'src/deals-board/banner-crew/BannerCrewPage';
import { BANNER_CREW_GANTT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineFrontComponent({
  universalIdentifier: BANNER_CREW_GANTT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'banner-crew-gantt',
  description: 'Календарь баннерщиков',
  component: BannerCrewPage,
});
