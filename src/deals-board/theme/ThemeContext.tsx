import { createContext, useContext, type ReactNode } from 'react';
import { useColorScheme } from 'twenty-sdk/front-component';

import { GlobalThemeStyles } from './GlobalThemeStyles';
import { getTheme, type ColorScheme, type ThemeTokens } from './tokens';

const ThemeContext = createContext<ThemeTokens | null>(null);

type ThemeProviderProps = {
  children: ReactNode;
};

export const ThemeProvider = ({ children }: ThemeProviderProps) => {
  const colorScheme = useColorScheme() as ColorScheme;
  const theme = getTheme(colorScheme);

  return (
    <ThemeContext.Provider value={theme}>
      <GlobalThemeStyles theme={theme} />
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeTokens => {
  const theme = useContext(ThemeContext);
  if (!theme) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return theme;
};

export const useThemeOptional = (colorScheme?: ColorScheme): ThemeTokens =>
  colorScheme ? getTheme(colorScheme) : useTheme();
