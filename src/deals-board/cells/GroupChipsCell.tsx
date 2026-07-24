import { PRINT_FIELD_GROUP_ID } from 'src/constants/print-field-group';

import { PrintPanelChip } from '../editors/PrintPanelChip';
import { RestorationMaketChip } from '../editors/RestorationMaketChip';
import { useGroupChipMode } from '../hooks/useGroupChipMode';
import { useLineItemGroupExpand } from '../hooks/useLineItemGroupExpand';
import { useTheme } from '../theme/ThemeContext';
import type { LineItemRow } from '../types';
import type { ColumnGroupEntry } from '../utils/active-group';
import {
  formatGroupChipLabel,
  getGroupChipStatus,
} from '../utils/column-groups';

export type GroupChipsCellProps = {
  groups: ColumnGroupEntry[];
  item: LineItemRow;
  isExpanded?: (lineItemId: string, groupId: string) => boolean;
  onToggle?: (lineItemId: string, groupId: string) => void;
};

export const GroupChipsCell = ({
  groups,
  item,
  isExpanded: controlledIsExpanded,
  onToggle,
}: GroupChipsCellProps) => {
  const { mode } = useGroupChipMode();
  const expansion = useLineItemGroupExpand();
  const isExpanded = controlledIsExpanded ?? expansion.isExpanded;
  const toggle = onToggle ?? expansion.toggle;
  const { colors, font, spacing } = useTheme();

  const showRestorationChip =
    item.tip === 'RESTAVRACIYA' || Boolean(item.ssylkaNaMakety?.primaryLinkUrl);

  if (groups.length === 0 && !showRestorationChip) {
    return null;
  }

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: spacing.xs,
        minWidth: 0,
      }}
    >
      {groups.map(({ group, members }) => {
        if (group.id === PRINT_FIELD_GROUP_ID) {
          return <PrintPanelChip key={group.id} item={item} />;
        }

        const active = isExpanded(item.id, group.id);
        const label = formatGroupChipLabel(
          group.name,
          getGroupChipStatus(members, item),
          mode,
        );

        return (
          <button
            key={group.id}
            type="button"
            aria-expanded={active}
            onClick={() => toggle(item.id, group.id)}
            style={{
              maxWidth: '100%',
              padding: '3px 8px',
              border: `1px solid ${active ? colors.accent : colors.borderStrong}`,
              borderRadius: '999px',
              background: active ? colors.accentMuted : 'transparent',
              color: active ? colors.accentText : 'inherit',
              cursor: 'pointer',
              font: 'inherit',
              fontWeight: active ? font.weightSemibold : font.weightNormal,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        );
      })}
      {showRestorationChip ? <RestorationMaketChip item={item} /> : null}
    </div>
  );
};
