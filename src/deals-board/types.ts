import type { LineItemType } from 'src/constants/line-item-types';
import type { BoardKind } from 'src/constants/product-stream';
import type { ProductStream } from 'src/constants/product-stream';
import type { LineItemStage } from 'src/constants/stages';
import type { ViewVisibility } from 'src/constants/view-visibility';

import type { FilterClause } from './filter-model/types';

export type ColumnGroupConfig = {
  id: string;
  name: string;
  order: number;
};

export type ColumnConfig = {
  field: string;
  label: string;
  width?: number;
  order: number;
  visible: boolean;
  groupId?: string;
};

export type DealBoardDatePreset =
  | 'today'
  | 'tomorrow'
  | 'dayAfterTomorrow'
  | 'week'
  | 'month'
  | 'future'
  | 'custom';

export type DealBoardFilters = {
  datePreset?: DealBoardDatePreset | null;
  dateFrom?: string;
  dateTo?: string;
  stages?: LineItemStage[];
  types?: LineItemType[];
  oplata?: string;
  search?: string;
  /** Multi-keyword OR search terms (preferred over `search` when set). */
  searchTerms?: string[];
  showAll?: boolean;
  companyIds?: string[];
  clauses?: FilterClause[];
};

export type DealBoardSort = { field: string; direction: 'AscNullsFirst' | 'DescNullsLast' };

export type DealBoardViewRecord = {
  id: string;
  name: string;
  visibility: ViewVisibility;
  boardKind?: BoardKind;
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  childGroups: ColumnGroupConfig[];
  filters: DealBoardFilters;
  sort: DealBoardSort[];
  isDefault: boolean;
};

export type OpportunityRow = {
  id: string;
  name: string;
  loadDate?: string;
  closeDate?: string;
  companyId?: string;
  companyName?: string;
  amount?: { amountMicros: number; currencyCode: string };
  tonyLink?: { primaryLinkUrl?: string };
  bitrixLink?: { primaryLinkUrl?: string };
  oplata?: string | null;
  stage?: string | null;
  stageZakreplen?: boolean | null;
  rashodPechat?: { amountMicros: number; currencyCode: string } | null;
  rashodFrezerovka?: { amountMicros: number; currencyCode: string } | null;
  rashodOkleyka?: { amountMicros: number; currencyCode: string } | null;
  [key: string]: unknown;
};

export type LineItemFileRef = { fileId: string; label?: string };

export type LineItemRow = {
  id: string;
  opportunityId: string;
  name: string;
  kolichestvo?: number;
  amount?: { amountMicros: number; currencyCode: string };
  kommentariy?: string;
  tip?: LineItemType | null;
  tipDetail?: string | null;
  poryadok?: number | null;
  stage?: LineItemStage | null;
  ssylkaNaMakety?: { primaryLinkUrl?: string; primaryLinkLabel?: string };
  plenka?: { markdown?: string };
  prevyuOkleyki?: LineItemFileRef[] | null;
  okleykaTelegramSentAt?: string | null;
  okleykaTelegramSentBy?: string | null;
  okleykaTelegramChatId?: string | null;
  productStream?: ProductStream | ProductStream[] | null;
  stoimostPechati?: { amountMicros: number; currencyCode: string };
  stoimostFrezy?: { amountMicros: number; currencyCode: string };
  stoimostOkleyki?: { amountMicros: number; currencyCode: string } | null;
  supplier?: { id: string; name: string } | null;
  supplierId?: string | null;
  [key: string]: unknown;
};
