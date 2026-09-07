import type { ColorScheme, ThemeTokens } from './theme/tokens';

export type ChipColor =
  | 'gray'
  | 'white'
  | 'blue'
  | 'green'
  | 'greenDark'
  | 'yellow'
  | 'orange'
  | 'purple'
  | 'pink'
  | 'red';

export const getChipPalette = (color: ChipColor, scheme: ColorScheme) =>
  CHIP_PALETTE[color]?.[scheme] ?? CHIP_PALETTE.gray[scheme];

/** Soft categorical tints — readable stage cues without rainbow wash. */
const CHIP_PALETTE: Record<
  ChipColor,
  { light: { bg: string; text: string }; dark: { bg: string; text: string } }
> = {
  gray: {
    light: { bg: 'rgba(120, 120, 128, 0.12)', text: '#636366' },
    dark: { bg: 'rgba(120, 120, 128, 0.24)', text: '#ebebf5' },
  },
  white: {
    light: { bg: 'rgba(0, 0, 0, 0.05)', text: '#3a3a3c' },
    dark: { bg: 'rgba(255, 255, 255, 0.12)', text: '#f5f5f7' },
  },
  blue: {
    light: { bg: 'rgba(0, 122, 255, 0.12)', text: '#007aff' },
    dark: { bg: 'rgba(10, 132, 255, 0.22)', text: '#64d2ff' },
  },
  green: {
    light: { bg: 'rgba(52, 199, 89, 0.14)', text: '#248a3d' },
    dark: { bg: 'rgba(48, 209, 88, 0.2)', text: '#30d158' },
  },
  greenDark: {
    light: { bg: 'rgba(36, 138, 61, 0.14)', text: '#1b6b30' },
    dark: { bg: 'rgba(48, 209, 88, 0.14)', text: '#30d158' },
  },
  yellow: {
    light: { bg: 'rgba(255, 159, 10, 0.14)', text: '#c93400' },
    dark: { bg: 'rgba(255, 214, 10, 0.18)', text: '#ffd60a' },
  },
  orange: {
    light: { bg: 'rgba(255, 149, 0, 0.14)', text: '#c93400' },
    dark: { bg: 'rgba(255, 159, 10, 0.2)', text: '#ff9f0a' },
  },
  purple: {
    light: { bg: 'rgba(175, 82, 222, 0.12)', text: '#8944ab' },
    dark: { bg: 'rgba(191, 90, 242, 0.22)', text: '#bf5af2' },
  },
  pink: {
    light: { bg: 'rgba(255, 45, 85, 0.1)', text: '#c9346a' },
    dark: { bg: 'rgba(255, 55, 95, 0.14)', text: '#ff8aa8' },
  },
  red: {
    light: { bg: 'rgba(255, 59, 48, 0.12)', text: '#d70015' },
    dark: { bg: 'rgba(255, 69, 58, 0.2)', text: '#ff453a' },
  },
};

type ChipProps = {
  text: string;
  color?: ChipColor;
  theme?: ThemeTokens;
  truncate?: boolean;
};

export const Chip = ({ text, color = 'gray', theme, truncate = true }: ChipProps) => {
  const scheme = theme?.colorScheme ?? 'light';
  const palette = getChipPalette(color, scheme);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        maxWidth: truncate ? '100%' : undefined,
        padding: '2px 8px',
        borderRadius: theme?.radius.pill ?? '999px',
        fontSize: theme?.font.sizeXs ?? '11px',
        fontWeight: theme?.font.weightMedium ?? 500,
        fontFamily: theme?.font.family ?? 'inherit',
        letterSpacing: '-0.01em',
        lineHeight: 1.35,
        whiteSpace: 'nowrap',
        overflow: truncate ? 'hidden' : 'visible',
        textOverflow: truncate ? 'ellipsis' : undefined,
        backgroundColor: palette.bg,
        color: palette.text,
      }}
    >
      {text}
    </span>
  );
};
