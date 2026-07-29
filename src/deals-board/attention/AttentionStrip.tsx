import { getLineItemTypeLabel, type LineItemType } from 'src/constants/line-item-types';

import { useTheme } from '../theme/ThemeContext';
import { ATTENTION_TIP_ORDER, type AttentionStats } from './compute';

type AttentionStripProps = {
  stats: AttentionStats;
  activeTip: LineItemType | null;
  onToggleTip: (tip: LineItemType) => void;
};

export const AttentionStrip = ({ stats, activeTip, onToggleTip }: AttentionStripProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;

  if (stats.total === 0) return null;

  const tips = ATTENTION_TIP_ORDER.filter((tip) => (stats.byTip[tip] ?? 0) > 0);

  return (
    <div
      data-attention-strip
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        margin: `${spacing.xs} ${spacing.md} 0`,
        padding: `6px ${spacing.sm}`,
        borderRadius: radius.md,
        backgroundColor: colors.warningMuted,
        border: `1px solid rgba(255, 214, 10, 0.22)`,
        minWidth: 0,
      }}
    >
      <span
        style={{
          fontSize: font.sizeXs,
          fontWeight: font.weightSemibold,
          color: colors.warning,
          letterSpacing: '-0.01em',
          flexShrink: 0,
        }}
      >
        Требует внимания · {stats.total}
      </span>
      {tips.map((tip) => {
        const count = stats.byTip[tip] ?? 0;
        const active = activeTip === tip;
        return (
          <button
            key={tip}
            type="button"
            onClick={() => onToggleTip(tip)}
            title={`${getLineItemTypeLabel(tip)}: ${count} поз. Клик — фильтр и подсветка`}
            style={{
              border: 'none',
              cursor: 'pointer',
              borderRadius: radius.pill,
              padding: '4px 9px',
              fontFamily: font.family,
              fontSize: font.sizeXs,
              fontWeight: font.weightMedium,
              backgroundColor: active ? colors.warning : colors.bgElevated,
              color: active ? '#1c1c1e' : colors.text,
              boxShadow: active ? undefined : `inset 0 0 0 1px ${colors.borderSubtle}`,
            }}
          >
            {getLineItemTypeLabel(tip)} · {count}
          </button>
        );
      })}
    </div>
  );
};
