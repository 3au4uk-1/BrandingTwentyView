import { openSidePanelPage, SidePanelPages } from 'twenty-sdk/front-component';

import type { BoardObjectName } from '../metadata/types';

type OpenViewRecordSidePanelParams = {
  page: typeof SidePanelPages.ViewRecord;
  recordId: string;
  objectNameSingular: BoardObjectName;
  resetNavigationStack?: boolean;
};

export const openRecordSidePanel = (
  objectNameSingular: BoardObjectName,
  recordId: string,
) =>
  openSidePanelPage({
    page: SidePanelPages.ViewRecord,
    recordId,
    objectNameSingular,
    resetNavigationStack: true,
  } as OpenViewRecordSidePanelParams & Parameters<typeof openSidePanelPage>[0]);
