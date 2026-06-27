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

export const getTheme = (colorScheme: ColorScheme): ThemeTokens => {
  if (colorScheme === 'dark') {
    return {
      colorScheme,
      colors: {
        bg: '#0c0c0e',
        bgSecondary: '#141416',
        bgTertiary: '#1a1a1e',
        bgElevated: '#1e1e22',
        bgHover: '#232328',
        bgActive: '#2a2a32',
        bgInset: '#111114',
        bgNested: '#16161a',
        border: '#2e2e34',
        borderSubtle: '#242428',
        borderStrong: '#3a3a42',
        text: '#ececee',
        textSecondary: '#b4b4bc',
        textMuted: '#7a7a86',
        textInverse: '#0c0c0e',
        accent: '#6b9fff',
        accentHover: '#5289f0',
        accentMuted: 'rgba(107, 159, 255, 0.14)',
        accentText: '#9ec0ff',
        success: '#4ade80',
        successMuted: 'rgba(74, 222, 128, 0.12)',
        warning: '#fbbf24',
        warningMuted: 'rgba(251, 191, 36, 0.12)',
        danger: '#f87171',
        dangerMuted: 'rgba(248, 113, 113, 0.12)',
        shadow: '0 1px 2px rgba(0, 0, 0, 0.45)',
        shadowLg: '0 16px 40px rgba(0, 0, 0, 0.55)',
        stickyShadow: '6px 0 12px rgba(0, 0, 0, 0.35)',
        rowExpandedAccent: '#6b9fff',
      },
      radius: { sm: '5px', md: '8px', lg: '10px', pill: '999px' },
      spacing: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
      font: {
        family: 'inherit',
        mono: 'ui-monospace, "SF Mono", "Cascadia Code", monospace',
        sizeXs: '11px',
        sizeSm: '12px',
        sizeMd: '13px',
        sizeLg: '14px',
        weightNormal: 400,
        weightMedium: 500,
        weightSemibold: 600,
        weightBold: 700,
      },
      layout: { toolbarHeight: '44px', rowHeight: '38px', childRowHeight: '34px' },
      zIndex: { sticky: 4, dropdown: 30, modal: 40 },
    };
  }

  return {
    colorScheme,
    colors: {
      bg: '#ffffff',
      bgSecondary: '#f8f8f9',
      bgTertiary: '#f0f0f2',
      bgElevated: '#ffffff',
      bgHover: '#f4f4f6',
      bgActive: '#eef2ff',
      bgInset: '#fafafa',
      bgNested: '#f6f6f8',
      border: '#e2e2e8',
      borderSubtle: '#ececf0',
      borderStrong: '#cacad4',
      text: '#141418',
      textSecondary: '#44444c',
      textMuted: '#71717e',
      textInverse: '#fafafa',
      accent: '#3b6fd9',
      accentHover: '#2f5fc4',
      accentMuted: 'rgba(59, 111, 217, 0.1)',
      accentText: '#2f5fc4',
      success: '#15803d',
      successMuted: 'rgba(21, 128, 61, 0.08)',
      warning: '#b45309',
      warningMuted: 'rgba(180, 83, 9, 0.08)',
      danger: '#dc2626',
      dangerMuted: 'rgba(220, 38, 38, 0.08)',
      shadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
      shadowLg: '0 16px 40px rgba(0, 0, 0, 0.1)',
      stickyShadow: '6px 0 12px rgba(0, 0, 0, 0.05)',
      rowExpandedAccent: '#3b6fd9',
    },
    radius: { sm: '5px', md: '8px', lg: '10px', pill: '999px' },
    spacing: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
    font: {
      family: 'inherit',
      mono: 'ui-monospace, "SF Mono", "Cascadia Code", monospace',
      sizeXs: '11px',
      sizeSm: '12px',
      sizeMd: '13px',
      sizeLg: '14px',
      weightNormal: 400,
      weightMedium: 500,
      weightSemibold: 600,
      weightBold: 700,
    },
    layout: { toolbarHeight: '44px', rowHeight: '38px', childRowHeight: '34px' },
    zIndex: { sticky: 4, dropdown: 30, modal: 40 },
  };
};

export const EMPTY_VALUE = '–';
