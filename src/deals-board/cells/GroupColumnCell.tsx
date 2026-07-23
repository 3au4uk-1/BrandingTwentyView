import type { ReactNode } from 'react';

import type { FieldDescriptor } from '../metadata/types';
import { useGroupChipMode } from '../hooks/useGroupChipMode';
import { useLineItemGroupExpand } from '../hooks/useLineItemGroupExpand';
import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';
import {
  formatGroupChipLabel,
  getGroupChipStatus,
} from '../utils/column-groups';
import { resolveFieldValue } from '../utils/resolve-field-value';
import { DynamicFieldCell } from './DynamicFieldCell';

type GroupColumnCellProps = {
  group: ColumnGroupConfig;
  members: ColumnConfig[];
  item: LineItemRow;
  descriptorByField: Map<string, FieldDescriptor>;
  visibleFields: readonly string[];
  renderMember?: (member: ColumnConfig, cell: ReactNode) => ReactNode;
  listMenuPresentation?: 'inline' | 'sheet';
  touchFriendly?: boolean;
  keepChipStyleWhenExpanded?: boolean;
};

export const GroupColumnCell = ({
  group,
  members,
  item,
  descriptorByField,
  visibleFields,
  renderMember,
  listMenuPresentation,
  touchFriendly,
  keepChipStyleWhenExpanded = false,
}: GroupColumnCellProps) => {
  const { mode } = useGroupChipMode();
  const { isExpanded, toggle } = useLineItemGroupExpand();
  const expanded = isExpanded(item.id, group.id);
  const label = formatGroupChipLabel(
    group.name,
    getGroupChipStatus(members, item),
    mode,
  );

  if (!expanded) {
    return (
      <button
        type="button"
        aria-expanded={false}
        onClick={() => toggle(item.id, group.id)}
        style={{
          maxWidth: '100%',
          padding: '3px 8px',
          border: '1px solid currentColor',
          borderRadius: '999px',
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          font: 'inherit',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div style={{ display: 'grid', gap: '6px' }}>
      <button
        type="button"
        aria-expanded={true}
        onClick={() => toggle(item.id, group.id)}
        style={{
          maxWidth: '100%',
          padding: keepChipStyleWhenExpanded ? '3px 8px' : 0,
          border: keepChipStyleWhenExpanded ? '1px solid currentColor' : 0,
          borderRadius: keepChipStyleWhenExpanded ? '999px' : undefined,
          background: 'transparent',
          color: 'inherit',
          cursor: 'pointer',
          font: 'inherit',
          fontWeight: 600,
          textAlign: 'left',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {keepChipStyleWhenExpanded ? label : group.name}
      </button>
      {members.map((member) => {
        const cell = (
          <DynamicFieldCell
            objectName="dealLineItem"
            recordId={item.id}
            field={member.field}
            descriptor={descriptorByField.get(member.field)}
            value={resolveFieldValue(item, member.field)}
            variant="child"
            row={item}
            visibleFields={visibleFields}
            listMenuPresentation={listMenuPresentation}
            touchFriendly={touchFriendly}
          />
        );

        return renderMember ? (
          <div key={member.field}>{renderMember(member, cell)}</div>
        ) : (
          <div key={member.field} style={{ display: 'grid', gap: '2px', minWidth: 0 }}>
            <span style={{ fontSize: '11px', opacity: 0.7 }}>{member.label}</span>
            {cell}
          </div>
        );
      })}
    </div>
  );
};
