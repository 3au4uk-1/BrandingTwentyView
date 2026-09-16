import { BooleanCell } from '../editors/BooleanCell';
import { DateCell } from '../editors/DateCell';
import { NumberCell } from '../editors/NumberCell';
import { SelectCell } from '../editors/SelectCell';
import { TextCell } from '../editors/TextCell';
import type { FieldDescriptor, BoardObjectName } from '../metadata/types';
import type { LineItemRow } from '../types';
import type { BoardStream } from 'src/constants/product-stream';

import { formatReadOnlyValue } from './format-read-only-value';
import { renderFieldOverride } from './overrides';

export type DynamicFieldCellProps = {
  objectName: BoardObjectName;
  recordId: string;
  field: string;
  descriptor?: FieldDescriptor;
  value: unknown;
  variant?: 'parent' | 'child';
  lineItems?: LineItemRow[];
  allDealLineItems?: LineItemRow[];
  isExpanded?: boolean;
  companyName?: string;
  row?: Record<string, unknown>;
  opportunityLinkFields?: FieldDescriptor[];
  onToggleExpand?: (id: string) => void;
  hideExpandButton?: boolean;
  listMenuPresentation?: 'inline' | 'sheet';
  boardStream?: BoardStream;
  touchFriendly?: boolean;
  visibleFields?: readonly string[];
};

const renderEditableCell = ({
  objectName,
  recordId,
  field,
  descriptor,
  value,
}: DynamicFieldCellProps) => {
  const fieldType = descriptor?.fieldType;

  switch (fieldType) {
    case 'TEXT':
      return (
        <TextCell
          objectName={objectName}
          recordId={recordId}
          fieldName={field}
          value={typeof value === 'string' ? value : value == null ? null : String(value)}
        />
      );
    case 'NUMBER':
      return (
        <NumberCell
          objectName={objectName}
          recordId={recordId}
          fieldName={field}
          value={typeof value === 'number' ? value : undefined}
        />
      );
    case 'BOOLEAN':
      return (
        <BooleanCell
          objectName={objectName}
          recordId={recordId}
          fieldName={field}
          value={typeof value === 'boolean' ? value : null}
        />
      );
    case 'DATE':
    case 'DATE_TIME':
      return (
        <DateCell
          objectName={objectName}
          recordId={recordId}
          fieldName={field}
          value={typeof value === 'string' ? value : null}
        />
      );
    case 'SELECT':
      return (
        <SelectCell
          objectName={objectName}
          recordId={recordId}
          fieldName={field}
          value={typeof value === 'string' ? value : null}
          options={descriptor?.options ?? []}
        />
      );
    default:
      return formatReadOnlyValue(fieldType, value);
  }
};

export const DynamicFieldCell = (props: DynamicFieldCellProps) => {
  const override = renderFieldOverride({
    field: props.field,
    recordId: props.recordId,
    value: props.value,
    variant: props.variant,
    lineItems: props.lineItems,
    allDealLineItems: props.allDealLineItems,
    isExpanded: props.isExpanded,
    companyName: props.companyName,
    row: props.row,
    opportunityLinkFields: props.opportunityLinkFields,
    onToggleExpand: props.onToggleExpand,
    hideExpandButton: props.hideExpandButton,
    listMenuPresentation: props.listMenuPresentation,
    boardStream: props.boardStream,
    touchFriendly: props.touchFriendly,
    visibleFields: props.visibleFields,
  });

  if (
    override !== null ||
    props.field === 'vzatoVRabotu' ||
    props.field === 'gotovo'
  ) {
    return override;
  }

  if (props.descriptor?.isEditable) {
    return renderEditableCell(props);
  }

  return formatReadOnlyValue(props.descriptor?.fieldType, props.value);
};
