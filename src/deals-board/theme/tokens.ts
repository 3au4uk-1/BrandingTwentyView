export type ColorScheme = 'light' | 'dark';

export type ThemeTokens = {
  colorScheme: ColorScheme;
  colors: {
    bg: string;
    bgSecondary: string;
    bgTertiary: string;
    bgElevated: string;
    bgHover: string;
    bgActive: string;
    bgInset: string;
    bgNested: string;
    border: string;
    borderSubtle: string;
    borderStrong: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    textInverse: string;
    accent: string;
    accentHover: string;
    accentMuted: string;
    accentText: string;
    success: string;
    successMuted: string;
    warning: string;
    warningMuted: string;
    danger: string;
    dangerMuted: string;
    shadow: string;
    shadowLg: string;
    stickyShadow: string;
    rowExpandedAccent: string;
    overlay: string;
  };
  radius: {
    sm: string;
    md: string;
    lg: string;
    pill: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  font: {
    family: string;
    mono: string;
    sizeXs: string;
    sizeSm: string;
    sizeMd: string;
    sizeLg: string;
    weightNormal: number;
    weightMedium: number;
    weightSemibold: number;
    weightBold: number;
  };
  layout: {
    toolbarHeight: string;
    rowHeight: string;
    childRowHeight: string;
  };
  zIndex: {
    sticky: number;
    dropdown: number;
    modal: number;
  };
};

/** SF Pro / system stack — Apple-readable without external font loads. */
const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", system-ui, sans-serif';
const FONT_MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

const RADIUS = { sm: '6px', md: '10px', lg: '14px', pill: '999px' } as const;
const SPACING = { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' } as const;
const FONT_SIZES = {
  family: FONT_FAMILY,
  mono: FONT_MONO,
  sizeXs: '11px',
  sizeSm: '12px',
  sizeMd: '13px',
  sizeLg: '15px',
  weightNormal: 400,
  weightMedium: 500,
    weightSemibold: 600,
    weightBold: 700,
} as const;
const LAYOUT = { toolbarHeight: '44px', rowHeight: '40px', childRowHeight: '36px' } as const;
const Z_INDEX = { sticky: 4, dropdown: 30, modal: 40 } as const;

export const getTheme = (colorScheme: ColorScheme): ThemeTokens => {
  if (colorScheme === 'dark') {
    return {
      colorScheme,
      colors: {
        bg: '#000000',
        bgSecondary: '#1c1c1e',
        bgTertiary: '#2c2c2e',
        bgElevated: '#3a3a3c',
        bgHover: '#48484a',
        bgActive: '#48484a',
        bgInset: '#1c1c1e',
        bgNested: '#161618',
        border: 'rgba(84, 84, 88, 0.55)',
        borderSubtle: 'rgba(84, 84, 88, 0.28)',
        borderStrong: 'rgba(84, 84, 88, 0.72)',
        text: '#f5f5f7',
        textSecondary: 'rgba(235, 235, 245, 0.6)',
        textMuted: 'rgba(235, 235, 245, 0.36)',
        textInverse: '#ffffff',
        accent: '#0a84ff',
        accentHover: '#409cff',
        accentMuted: 'rgba(10, 132, 255, 0.18)',
        accentText: '#64d2ff',
        success: '#30d158',
        successMuted: 'rgba(48, 209, 88, 0.14)',
        warning: '#ffd60a',
        warningMuted: 'rgba(255, 214, 10, 0.12)',
        danger: '#ff453a',
        dangerMuted: 'rgba(255, 69, 58, 0.14)',
        shadow: '0 0.5px 0 rgba(255, 255, 255, 0.06), 0 1px 2px rgba(0, 0, 0, 0.4)',
        shadowLg: '0 12px 40px rgba(0, 0, 0, 0.5), 0 0 0 0.5px rgba(255, 255, 255, 0.08)',
        stickyShadow: '8px 0 20px rgba(0, 0, 0, 0.28)',
        rowExpandedAccent: '#0a84ff',
        overlay: 'rgba(0, 0, 0, 0.48)',
      },
      radius: { ...RADIUS },
      spacing: { ...SPACING },
      font: { ...FONT_SIZES },
      layout: { ...LAYOUT },
      zIndex: { ...Z_INDEX },
    };
  }

  return {
    colorScheme,
    colors: {
      bg: '#ffffff',
      bgSecondary: '#f2f2f7',
      bgTertiary: '#e5e5ea',
      bgElevated: '#ffffff',
      bgHover: '#e8e8ed',
      bgActive: '#dcdce1',
      bgInset: '#f2f2f7',
      bgNested: '#f7f7f9',
      border: 'rgba(60, 60, 67, 0.18)',
      borderSubtle: 'rgba(60, 60, 67, 0.1)',
      borderStrong: 'rgba(60, 60, 67, 0.29)',
      text: '#000000',
      textSecondary: 'rgba(60, 60, 67, 0.72)',
      textMuted: 'rgba(60, 60, 67, 0.48)',
      textInverse: '#ffffff',
      accent: '#007aff',
      accentHover: '#0066d6',
      accentMuted: 'rgba(0, 122, 255, 0.12)',
      accentText: '#007aff',
      success: '#34c759',
      successMuted: 'rgba(52, 199, 89, 0.12)',
      warning: '#ff9f0a',
      warningMuted: 'rgba(255, 159, 10, 0.12)',
      danger: '#ff3b30',
      dangerMuted: 'rgba(255, 59, 48, 0.12)',
      shadow: '0 1px 0 rgba(0, 0, 0, 0.03), 0 1px 2px rgba(0, 0, 0, 0.04)',
      shadowLg: '0 10px 30px rgba(0, 0, 0, 0.12), 0 0 0 0.5px rgba(0, 0, 0, 0.04)',
      stickyShadow: '8px 0 16px rgba(0, 0, 0, 0.06)',
      rowExpandedAccent: '#007aff',
      overlay: 'rgba(0, 0, 0, 0.32)',
    },
    radius: { ...RADIUS },
    spacing: { ...SPACING },
    font: { ...FONT_SIZES },
    layout: { ...LAYOUT },
    zIndex: { ...Z_INDEX },
  };
};

export const EMPTY_VALUE = '–';
