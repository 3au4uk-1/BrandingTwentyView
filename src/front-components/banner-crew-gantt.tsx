import { defineFrontComponent } from 'twenty-sdk/define';

import { BannerCrewGanttPage } from 'src/deals-board/banner-crew/BannerCrewGanttPage';
import { BANNER_CREW_GANTT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/constants/universal-identifiers';

export default defineFrontComponent({
  universalIdentifier: BANNER_CREW_GANTT_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'banner-crew-gantt',
  description: 'Гант занятости баннерщиков',
  component: BannerCrewGanttPage,
});
