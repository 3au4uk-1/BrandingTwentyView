import type { LineItemStage } from 'src/constants/stages';
import type { ViewVisibility } from 'src/constants/view-visibility';

export type ColumnConfig = {
  field: string;
  label: string;
  width?: number;
  order: number;
  visible: boolean;
};

export type DealBoardFilters = {
  dateFrom?: string;
  dateTo?: string;
  stages?: LineItemStage[];
  oplata?: string;
  search?: string;
};

export type DealBoardSort = { field: string; direction: 'AscNullsFirst' | 'DescNullsLast' };

export type DealBoardViewRecord = {
  id: string;
  name: string;
  visibility: ViewVisibility;
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  filters: DealBoardFilters;
  sort: DealBoardSort[];
  isDefault: boolean;
};

export type OpportunityRow = {
  id: string;
  name: string;
  loadDate?: string;
  companyId?: string;
  companyName?: string;
  amount?: { amountMicros: number; currencyCode: string };
  tonyLink?: { primaryLinkUrl?: string };
  bitrixLink?: { primaryLinkUrl?: string };
  oplata?: string | null;
};

export type LineItemRow = {
  id: string;
  opportunityId: string;
  name: string;
  kolichestvo?: number;
  amount?: { amountMicros: number; currencyCode: string };
  kommentariy?: string;
  stage?: LineItemStage | null;
  ssylkaNaMakety?: { primaryLinkUrl?: string; primaryLinkLabel?: string };
  plenka?: { markdown?: string };
};
