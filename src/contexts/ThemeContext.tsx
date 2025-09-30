import React, { createContext, useMemo, useCallback, type ReactNode } from 'react';
import { ThemeProvider as MuiThemeProvider, type PaletteMode } from '@mui/material/styles';
import { getTheme } from '../theme/theme';
import { useSettings } from '../hooks/useSettings';

export interface ThemeContextType {
  mode: PaletteMode;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const { settings, updateSetting } = useSettings();

  // Determine the current theme mode
  const mode = useMemo((): PaletteMode => {
    if (settings.theme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return settings.theme;
  }, [settings.theme]);

  // Create theme based on current mode
  const theme = useMemo(() => getTheme(mode), [mode]);

  const toggleTheme = useCallback(() => {
    const newTheme = mode === 'light' ? 'dark' : 'light';
    updateSetting('theme', newTheme);
  }, [mode, updateSetting]);

  const contextValue: ThemeContextType = useMemo(() => ({
    mode,
    toggleTheme,
  }), [mode, toggleTheme]);

  return (
    <ThemeContext.Provider value={contextValue}>
      <MuiThemeProvider theme={theme}>
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Export the context for use in the useTheme hook
export default ThemeContext;