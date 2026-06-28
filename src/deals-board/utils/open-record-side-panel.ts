import { openSidePanelPage } from 'twenty-sdk/front-component';

import type { BoardObjectName } from '../metadata/types';

export const openRecordSidePanel = (
  objectNameSingular: BoardObjectName,
  recordId: string,
) =>
  openSidePanelPage({
    page: 'ViewRecord',
    recordId,
    objectNameSingular,
  });
