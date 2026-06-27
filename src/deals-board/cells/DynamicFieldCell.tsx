import { BooleanCell } from '../editors/BooleanCell';
import { DateCell } from '../editors/DateCell';
import { NumberCell } from '../editors/NumberCell';
import { SelectCell } from '../editors/SelectCell';
import { TextCell } from '../editors/TextCell';
import type { FieldDescriptor, BoardObjectName } from '../metadata/types';
import type { LineItemRow } from '../types';

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
  isExpanded?: boolean;
  companyName?: string;
  tonyLink?: { primaryLinkUrl?: string };
  bitrixLink?: { primaryLinkUrl?: string };
  onToggleExpand?: (id: string) => void;
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
    isExpanded: props.isExpanded,
    companyName: props.companyName,
    tonyLink: props.tonyLink,
    bitrixLink: props.bitrixLink,
    onToggleExpand: props.onToggleExpand,
  });

  if (override !== null) {
    return override;
  }

  if (props.descriptor?.isEditable) {
    return renderEditableCell(props);
  }

  return formatReadOnlyValue(props.descriptor?.fieldType, props.value);
};
