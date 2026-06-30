import { DatePickerModal } from './DatePickerModal';
import type { BoardObjectName } from '../metadata/types';

type DateCellProps = {
  objectName: BoardObjectName;
  recordId: string;
  fieldName: string;
  value?: string | null;
};

export const DateCell = (props: DateCellProps) => <DatePickerModal {...props} />;
