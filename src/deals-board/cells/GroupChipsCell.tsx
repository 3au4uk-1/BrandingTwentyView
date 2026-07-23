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
};

export const GroupChipsCell = ({ groups, item }: GroupChipsCellProps) => {
  const { mode } = useGroupChipMode();
  const { isExpanded, toggle } = useLineItemGroupExpand();
  const { colors, font, spacing } = useTheme();

  if (groups.length === 0) {
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
    </div>
  );
};
