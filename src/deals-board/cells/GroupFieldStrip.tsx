import type { ReactNode } from 'react';

import type { FieldDescriptor } from '../metadata/types';
import type { ColumnConfig, LineItemRow } from '../types';
import type { BoardStream } from 'src/constants/product-stream';
import { resolveFieldValue } from '../utils/resolve-field-value';

import { DynamicFieldCell } from './DynamicFieldCell';

export type GroupFieldStripProps = {
  members: ColumnConfig[] | null;
  item: LineItemRow;
  descriptorByField: Map<string, FieldDescriptor>;
  renderMember?: (member: ColumnConfig, cell: ReactNode) => ReactNode;
  listMenuPresentation?: 'inline' | 'sheet';
  boardStream?: BoardStream;
  touchFriendly?: boolean;
};

export const GroupFieldStrip = ({
  members,
  item,
  descriptorByField,
  renderMember,
  listMenuPresentation,
  boardStream,
  touchFriendly,
}: GroupFieldStripProps) => {
  if (!members?.length) {
    return null;
  }

  const visibleFields = members.map(({ field }) => field);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: '8px',
        minWidth: 0,
        overflowX: 'auto',
      }}
    >
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
            boardStream={boardStream}
            touchFriendly={touchFriendly}
          />
        );

        return (
          <div
            key={member.field}
            style={{
              display: 'grid',
              flex: '0 0 auto',
              gap: '2px',
              minWidth: member.width ? `${member.width}px` : '120px',
            }}
          >
            {renderMember ? (
              renderMember(member, cell)
            ) : (
              <>
                <span style={{ fontSize: '11px', opacity: 0.7 }}>
                  {member.label}
                </span>
                {cell}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
};
