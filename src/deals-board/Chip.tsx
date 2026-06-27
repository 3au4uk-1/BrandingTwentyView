import type { ColorScheme, ThemeTokens } from './theme/tokens';

export type ChipColor = 'gray' | 'blue' | 'green' | 'yellow' | 'orange' | 'purple' | 'pink' | 'red';

export const getChipPalette = (color: ChipColor, scheme: ColorScheme) =>
  CHIP_PALETTE[color]?.[scheme] ?? CHIP_PALETTE.gray[scheme];

const CHIP_PALETTE: Record<
  ChipColor,
  { light: { bg: string; text: string }; dark: { bg: string; text: string } }
> = {
  gray: {
    light: { bg: 'rgba(113, 113, 122, 0.12)', text: '#52525b' },
    dark: { bg: 'rgba(161, 161, 170, 0.16)', text: '#d4d4d8' },
  },
  blue: {
    light: { bg: 'rgba(37, 99, 235, 0.1)', text: '#2563eb' },
    dark: { bg: 'rgba(59, 130, 246, 0.18)', text: '#93c5fd' },
  },
  green: {
    light: { bg: 'rgba(22, 163, 74, 0.1)', text: '#16a34a' },
    dark: { bg: 'rgba(34, 197, 94, 0.16)', text: '#86efac' },
  },
  yellow: {
    light: { bg: 'rgba(217, 119, 6, 0.1)', text: '#b45309' },
    dark: { bg: 'rgba(245, 158, 11, 0.16)', text: '#fcd34d' },
  },
  orange: {
    light: { bg: 'rgba(234, 88, 12, 0.1)', text: '#ea580c' },
    dark: { bg: 'rgba(249, 115, 22, 0.16)', text: '#fdba74' },
  },
  purple: {
    light: { bg: 'rgba(124, 58, 237, 0.1)', text: '#7c3aed' },
    dark: { bg: 'rgba(168, 85, 247, 0.16)', text: '#d8b4fe' },
  },
  pink: {
    light: { bg: 'rgba(219, 39, 119, 0.1)', text: '#db2777' },
    dark: { bg: 'rgba(236, 72, 153, 0.16)', text: '#f9a8d4' },
  },
  red: {
    light: { bg: 'rgba(220, 38, 38, 0.1)', text: '#dc2626' },
    dark: { bg: 'rgba(239, 68, 68, 0.16)', text: '#fca5a5' },
  },
};

type ChipProps = {
  text: string;
  color?: ChipColor;
  theme?: ThemeTokens;
};

export const Chip = ({ text, color = 'gray', theme }: ChipProps) => {
  const scheme = theme?.colorScheme ?? 'light';
  const palette = getChipPalette(color, scheme);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        maxWidth: '100%',
        padding: '2px 8px',
        borderRadius: theme?.radius.pill ?? '999px',
        fontSize: theme?.font.sizeXs ?? '11px',
        fontWeight: theme?.font.weightMedium ?? 500,
        fontFamily: theme?.font.family ?? 'inherit',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        backgroundColor: palette.bg,
        color: palette.text,
      }}
    >
      {text}
    </span>
  );
};
