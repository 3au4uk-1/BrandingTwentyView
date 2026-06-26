export type ChipColor = 'gray' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'pink' | 'red';

const CHIP_STYLES: Record<ChipColor, { backgroundColor: string; color: string }> = {
  gray: { backgroundColor: 'rgba(120, 120, 120, 0.16)', color: '#8a8a8a' },
  blue: { backgroundColor: 'rgba(59, 130, 246, 0.16)', color: '#3b82f6' },
  green: { backgroundColor: 'rgba(34, 197, 94, 0.16)', color: '#22c55e' },
  yellow: { backgroundColor: 'rgba(234, 179, 8, 0.16)', color: '#ca8a04' },
  orange: { backgroundColor: 'rgba(249, 115, 22, 0.16)', color: '#f97316' },
  purple: { backgroundColor: 'rgba(168, 85, 247, 0.16)', color: '#a855f7' },
  pink: { backgroundColor: 'rgba(236, 72, 153, 0.16)', color: '#ec4899' },
  red: { backgroundColor: 'rgba(239, 68, 68, 0.16)', color: '#ef4444' },
};

type ChipProps = {
  text: string;
  color?: ChipColor;
};

export const Chip = ({ text, color = 'gray' }: ChipProps) => {
  const palette = CHIP_STYLES[color] ?? CHIP_STYLES.gray;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        maxWidth: '100%',
        padding: '2px 8px',
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 500,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        backgroundColor: palette.backgroundColor,
        color: palette.color,
      }}
    >
      {text}
    </span>
  );
};
