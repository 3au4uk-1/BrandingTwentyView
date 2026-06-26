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
        bg: '#141414',
        bgSecondary: '#1a1a1a',
        bgTertiary: '#222222',
        bgElevated: '#262626',
        bgHover: '#2a2a2a',
        bgActive: '#2f3544',
        bgInset: '#181818',
        border: '#333333',
        borderSubtle: '#2a2a2a',
        borderStrong: '#444444',
        text: '#f4f4f5',
        textSecondary: '#d4d4d8',
        textMuted: '#a1a1aa',
        textInverse: '#18181b',
        accent: '#3b82f6',
        accentHover: '#2563eb',
        accentMuted: 'rgba(59, 130, 246, 0.18)',
        accentText: '#93c5fd',
        success: '#22c55e',
        successMuted: 'rgba(34, 197, 94, 0.16)',
        warning: '#f59e0b',
        warningMuted: 'rgba(245, 158, 11, 0.16)',
        danger: '#ef4444',
        dangerMuted: 'rgba(239, 68, 68, 0.16)',
        shadow: '0 1px 2px rgba(0, 0, 0, 0.35)',
        shadowLg: '0 12px 32px rgba(0, 0, 0, 0.55)',
        stickyShadow: '4px 0 8px rgba(0, 0, 0, 0.35)',
      },
      radius: { sm: '4px', md: '8px', lg: '12px', pill: '999px' },
      spacing: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
      font: {
        family: 'inherit',
        sizeXs: '11px',
        sizeSm: '12px',
        sizeMd: '13px',
        sizeLg: '14px',
        weightNormal: 400,
        weightMedium: 500,
        weightSemibold: 600,
        weightBold: 700,
      },
      layout: { toolbarHeight: '48px', rowHeight: '40px', childRowHeight: '36px' },
      zIndex: { sticky: 4, dropdown: 30, modal: 40 },
    };
  }

  return {
    colorScheme,
    colors: {
      bg: '#ffffff',
      bgSecondary: '#fafafa',
      bgTertiary: '#f4f4f5',
      bgElevated: '#ffffff',
      bgHover: '#f4f4f5',
      bgActive: '#eff6ff',
      bgInset: '#fafafa',
      border: '#e4e4e7',
      borderSubtle: '#f0f0f2',
      borderStrong: '#d4d4d8',
      text: '#18181b',
      textSecondary: '#3f3f46',
      textMuted: '#71717a',
      textInverse: '#fafafa',
      accent: '#2563eb',
      accentHover: '#1d4ed8',
      accentMuted: 'rgba(37, 99, 235, 0.1)',
      accentText: '#2563eb',
      success: '#16a34a',
      successMuted: 'rgba(22, 163, 74, 0.1)',
      warning: '#d97706',
      warningMuted: 'rgba(217, 119, 6, 0.1)',
      danger: '#dc2626',
      dangerMuted: 'rgba(220, 38, 38, 0.1)',
      shadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
      shadowLg: '0 12px 32px rgba(0, 0, 0, 0.12)',
      stickyShadow: '4px 0 8px rgba(0, 0, 0, 0.06)',
    },
    radius: { sm: '4px', md: '8px', lg: '12px', pill: '999px' },
    spacing: { xs: '4px', sm: '8px', md: '12px', lg: '16px', xl: '24px' },
    font: {
      family: 'inherit',
      sizeXs: '11px',
      sizeSm: '12px',
      sizeMd: '13px',
      sizeLg: '14px',
      weightNormal: 400,
      weightMedium: 500,
      weightSemibold: 600,
      weightBold: 700,
    },
    layout: { toolbarHeight: '48px', rowHeight: '40px', childRowHeight: '36px' },
    zIndex: { sticky: 4, dropdown: 30, modal: 40 },
  };
};

export const EMPTY_VALUE = '–';
