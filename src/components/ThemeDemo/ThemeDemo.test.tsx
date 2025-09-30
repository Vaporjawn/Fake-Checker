import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import ThemeDemo from './ThemeDemo';
import { ThemeContext } from '../../contexts/ThemeContext';

// Mock the useTheme hook
const mockThemeContext = {
  mode: 'light' as const,
  toggleColorMode: jest.fn(),
};

const theme = createTheme({
  palette: {
    mode: 'light',
  },
});

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeContext.Provider value={mockThemeContext}>
      <ThemeProvider theme={theme}>
        {component}
      </ThemeProvider>
    </ThemeContext.Provider>
  );
};

describe('ThemeDemo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the theme demo component', () => {
    renderWithTheme(<ThemeDemo />);

    expect(screen.getByText(/Theme Demo - Current Mode: light/)).toBeInTheDocument();
  });

  it('should display background colors section', () => {
    renderWithTheme(<ThemeDemo />);

    expect(screen.getByText('Background Colors')).toBeInTheDocument();
    expect(screen.getByText('background.default')).toBeInTheDocument();
    expect(screen.getByText('background.paper')).toBeInTheDocument();
  });

  it('should display text colors section', () => {
    renderWithTheme(<ThemeDemo />);

    expect(screen.getByText('Text Colors')).toBeInTheDocument();
    expect(screen.getByText('Primary Text')).toBeInTheDocument();
    expect(screen.getByText('Secondary Text')).toBeInTheDocument();
    expect(screen.getByText('Disabled Text')).toBeInTheDocument();
  });

  it('should render Material-UI components section', () => {
    renderWithTheme(<ThemeDemo />);

    expect(screen.getByText('Material-UI Components')).toBeInTheDocument();
    expect(screen.getByText('This is a Paper component')).toBeInTheDocument();
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Sample AppBar')).toBeInTheDocument();
  });

  it('should render form elements', () => {
    renderWithTheme(<ThemeDemo />);

    expect(screen.getByLabelText('Sample Input')).toBeInTheDocument();
    expect(screen.getByLabelText('Sample Switch')).toBeInTheDocument();
  });

  it('should render buttons with different variants', () => {
    renderWithTheme(<ThemeDemo />);

    expect(screen.getByRole('button', { name: 'Contained' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Outlined' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Text' })).toBeInTheDocument();
  });

  it('should render chips with different colors', () => {
    renderWithTheme(<ThemeDemo />);

    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Secondary')).toBeInTheDocument();
  });

  it('should render alerts with different severities', () => {
    renderWithTheme(<ThemeDemo />);

    expect(screen.getByText('Success Alert')).toBeInTheDocument();
    expect(screen.getByText('Info Alert')).toBeInTheDocument();
    expect(screen.getByText('Warning Alert')).toBeInTheDocument();
    expect(screen.getByText('Error Alert')).toBeInTheDocument();
  });

  it('should display current theme properties', () => {
    renderWithTheme(<ThemeDemo />);

    expect(screen.getByText('Current Theme Properties')).toBeInTheDocument();
    expect(screen.getByText(/Mode: light/)).toBeInTheDocument();
  });

  it('should render with dark mode', () => {
    const darkMockThemeContext = {
      mode: 'dark' as const,
      toggleColorMode: jest.fn(),
    };

    const darkTheme = createTheme({
      palette: {
        mode: 'dark',
      },
    });

    render(
      <ThemeContext.Provider value={darkMockThemeContext}>
        <ThemeProvider theme={darkTheme}>
          <ThemeDemo />
        </ThemeProvider>
      </ThemeContext.Provider>
    );

    expect(screen.getByText(/Theme Demo - Current Mode: dark/)).toBeInTheDocument();
    expect(screen.getByText(/Mode: dark/)).toBeInTheDocument();
  });
});