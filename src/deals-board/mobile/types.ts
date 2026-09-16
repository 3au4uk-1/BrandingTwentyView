import type { LineItemQueryFilters } from '../api/line-items';
import type { FilterClause, FilterState } from '../filter-model/types';
import type { FieldDescriptor } from '../metadata/types';
import type {
  ColumnConfig,
  ColumnGroupConfig,
  DealBoardViewRecord,
  LineItemRow,
  OpportunityRow,
} from '../types';
import type { BoardStream } from 'src/constants/product-stream';

export type MobileDealsBoardProps = {
  activeView?: DealBoardViewRecord;
  views: DealBoardViewRecord[];
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  childGroups: ColumnGroupConfig[];
  parentDescriptorByField: Map<string, FieldDescriptor>;
  childDescriptorByField: Map<string, FieldDescriptor>;
  opportunityLinkFields: FieldDescriptor[];
  records: OpportunityRow[];
  lineItems: LineItemRow[];
  allDealLineItems?: LineItemRow[];
  boardStream?: BoardStream;
  lineItemFilters?: LineItemQueryFilters;
  totalCount: number;
  page: number;
  totalPages: number;
  showAll: boolean;
  maxRecordsReached?: boolean;
  activeFilterCount?: number;
  filterValue: FilterState;
  viewClauses: FilterClause[];
  onFilterChange: (next: FilterState) => void;
  onFilterReset: () => void;
  onPageChange: (nextPage: number) => void;
  onSelectView: (id: string) => void;
  onCreateView: () => void;
  onEditView: () => void;
  onParentColumnsSave?: (columns: ColumnConfig[], groups: ColumnGroupConfig[]) => Promise<void>;
  onChildColumnsSave?: (columns: ColumnConfig[], groups: ColumnGroupConfig[]) => Promise<void>;
  onResetFilters?: () => void;
  isLoading?: boolean;
  isViewLoading?: boolean;
  errorMessage?: string;
};
