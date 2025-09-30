import { createTheme, type ThemeOptions, type PaletteMode } from '@mui/material/styles';

const getThemeOptions = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    primary: {
      main: mode === 'dark' ? '#90caf9' : '#1976d2',
      light: mode === 'dark' ? '#bbdefb' : '#42a5f5',
      dark: mode === 'dark' ? '#42a5f5' : '#1565c0',
    },
    secondary: {
      main: mode === 'dark' ? '#f48fb1' : '#dc004e',
    },
    background: {
      default: mode === 'dark' ? '#121212' : '#fafafa',
      paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
    },
    text: {
      primary: mode === 'dark' ? '#ffffff' : '#202124',
      secondary: mode === 'dark' ? '#b3b3b3' : '#5f6368',
    },
    divider: mode === 'dark' ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.12)',
    action: {
      hover: mode === 'dark' ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
      selected: mode === 'dark' ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.08)',
    },
  },
  typography: {
    fontFamily: 'Google Sans, Roboto, Arial, sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 400,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 400,
      letterSpacing: '-0.01em',
    },
    body1: {
      fontSize: '0.875rem',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '0.75rem',
      lineHeight: 1.4,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 24,
          padding: '8px 16px',
          fontWeight: 500,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: mode === 'dark'
            ? '0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.4)'
            : '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)',
          '&:hover': {
            boxShadow: mode === 'dark'
              ? '0 3px 6px rgba(0,0,0,0.4), 0 3px 6px rgba(0,0,0,0.5)'
              : '0 3px 6px rgba(0,0,0,0.16), 0 3px 6px rgba(0,0,0,0.23)',
            transform: 'var(--motion-transform, translateY(-2px))',
          },
          transition: 'all var(--motion-duration, 0.3s) var(--motion-easing, cubic-bezier(0.25, 0.8, 0.25, 1))',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#1e1e1e' : '#fff',
          color: mode === 'dark' ? '#ffffff' : '#202124',
          boxShadow: mode === 'dark'
            ? '0 2px 4px rgba(0,0,0,0.3)'
            : '0 2px 4px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

// Create theme functions for light and dark modes
export const lightTheme = createTheme(getThemeOptions('light'));
export const darkTheme = createTheme(getThemeOptions('dark'));

// Function to get theme based on mode
export const getTheme = (mode: PaletteMode) => {
  return mode === 'dark' ? darkTheme : lightTheme;
};

// Default export (light theme for backward compatibility)
export const theme = lightTheme;