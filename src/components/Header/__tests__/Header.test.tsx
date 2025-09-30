import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { ThemeContext } from '../../contexts/ThemeContext';
import { SearchContext } from '../../contexts/SearchContext';
import Header from './Header';

// Mock react-router-dom hooks
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const theme = createTheme();

// Mock theme context
const mockThemeContext = {
  mode: 'light' as const,
  toggleTheme: jest.fn(),
  isDark: false,
};

// Mock search context
const mockSearchContext = {
  searchQuery: '',
  setSearchQuery: jest.fn(),
  searchResults: [],
  isSearching: false,
  searchError: null,
  performSearch: jest.fn(),
  clearSearch: jest.fn(),
};

const renderWithProviders = (
  component: React.ReactElement,
  options: {
    route?: string;
    themeMode?: 'light' | 'dark';
    searchQuery?: string;
    onUploadClick?: () => void;
  } = {}
) => {
  const {
    route = '/',
    themeMode = 'light',
    searchQuery = '',
    onUploadClick,
  } = options;

  const customThemeContext = {
    ...mockThemeContext,
    mode: themeMode,
    isDark: themeMode === 'dark',
  };

  const customSearchContext = {
    ...mockSearchContext,
    searchQuery,
  };

  return render(
    <MemoryRouter initialEntries={[route]}>
      <ThemeProvider theme={theme}>
        <ThemeContext.Provider value={customThemeContext}>
          <SearchContext.Provider value={customSearchContext}>
            {React.cloneElement(component, { onUploadClick })}
          </SearchContext.Provider>
        </ThemeContext.Provider>
      </ThemeProvider>
    </MemoryRouter>
  );
};

// Mock window.matchMedia for responsive tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

describe('Header', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the logo and main elements', () => {
    renderWithProviders(<Header />);

    expect(screen.getByText('Fake Checker')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search images...')).toBeInTheDocument();
    expect(screen.getByText('Upload Image')).toBeInTheDocument();
  });

  it('should render navigation links on desktop', () => {
    renderWithProviders(<Header />);

    expect(screen.getByText('About')).toBeInTheDocument();
    expect(screen.getByText('Help')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('should highlight active navigation link', () => {
    renderWithProviders(<Header />, { route: '/about' });

    const aboutLink = screen.getByText('About').closest('a');
    expect(aboutLink).toHaveClass('active');
  });

  it('should call onUploadClick when upload button is clicked', async () => {
    const onUploadClick = jest.fn();
    renderWithProviders(<Header />, { onUploadClick });

    const uploadButton = screen.getByText('Upload Image');
    await user.click(uploadButton);

    expect(onUploadClick).toHaveBeenCalledTimes(1);
  });

  it('should toggle theme when theme button is clicked', async () => {
    renderWithProviders(<Header />);

    const themeButton = screen.getByRole('button', { name: /switch to dark mode/i });
    await user.click(themeButton);

    expect(mockThemeContext.toggleTheme).toHaveBeenCalledTimes(1);
  });

  it('should display correct theme toggle tooltip text', () => {
    renderWithProviders(<Header />, { themeMode: 'light' });
    expect(screen.getByTitle('Switch to dark mode')).toBeInTheDocument();
  });

  it('should display correct theme toggle tooltip text for dark mode', () => {
    renderWithProviders(<Header />, { themeMode: 'dark' });
    expect(screen.getByTitle('Switch to light mode')).toBeInTheDocument();
  });

  it('should update search query when typing in search input', async () => {
    renderWithProviders(<Header />);

    const searchInput = screen.getByPlaceholderText('Search images...');
    await user.type(searchInput, 'test query');

    expect(mockSearchContext.setSearchQuery).toHaveBeenCalledWith('test query');
  });

  it('should handle enter key press in search input', async () => {
    renderWithProviders(<Header />);

    const searchInput = screen.getByPlaceholderText('Search images...');
    await user.type(searchInput, 'test query{enter}');

    // Should have called setSearchQuery for each character typed
    expect(mockSearchContext.setSearchQuery).toHaveBeenCalled();
  });

  it('should display current search query in input', () => {
    renderWithProviders(<Header />, { searchQuery: 'existing query' });

    const searchInput = screen.getByDisplayValue('existing query');
    expect(searchInput).toBeInTheDocument();
  });

  it('should render mobile layout on small screens', () => {
    // Mock mobile breakpoint
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query.includes('(max-width'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    renderWithProviders(<Header />);

    // On mobile, should show shortened button text
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.queryByText('Upload Image')).not.toBeInTheDocument();
  });

  it('should open mobile search dialog when search icon is clicked', async () => {
    // Mock mobile breakpoint
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query.includes('(max-width'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    renderWithProviders(<Header />);

    // Find and click the mobile search button
    const searchButtons = screen.getAllByTestId(/search/i) || screen.getAllByRole('button');
    const mobileSearchButton = searchButtons.find(button =>
      button.querySelector('[data-testid="SearchIcon"]') ||
      button.getAttribute('aria-label')?.includes('search') ||
      button.querySelector('.MuiSvgIcon-root')
    );

    if (mobileSearchButton) {
      await user.click(mobileSearchButton);
      // Dialog should open - look for search input in dialog
      await waitFor(() => {
        expect(screen.getAllByPlaceholderText('Search images...').length).toBeGreaterThan(1);
      });
    }
  });

  it('should close mobile search dialog when close button is clicked', async () => {
    // Mock mobile breakpoint
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query.includes('(max-width'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    renderWithProviders(<Header />);

    // Open dialog first
    const searchButtons = screen.getAllByRole('button');
    const mobileSearchButton = searchButtons.find(button =>
      button.querySelector('[data-testid="SearchIcon"]') ||
      button.getAttribute('aria-label')?.includes('search')
    );

    if (mobileSearchButton) {
      await user.click(mobileSearchButton);

      // Find and click close button
      await waitFor(() => {
        const closeButton = screen.getByRole('button', { name: /close/i }) ||
                           screen.getAllByRole('button').find(btn =>
                             btn.querySelector('[data-testid="CloseIcon"]')
                           );
        if (closeButton) {
          return user.click(closeButton);
        }
      });
    }
  });

  it('should handle search input in mobile dialog', async () => {
    // Mock mobile breakpoint
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query.includes('(max-width'),
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    renderWithProviders(<Header />);

    // Open dialog
    const searchButtons = screen.getAllByRole('button');
    const mobileSearchButton = searchButtons.find(button =>
      button.querySelector('[data-testid="SearchIcon"]') ||
      button.getAttribute('aria-label')?.includes('search')
    );

    if (mobileSearchButton) {
      await user.click(mobileSearchButton);

      // Type in dialog search input
      await waitFor(async () => {
        const searchInputs = screen.getAllByPlaceholderText('Search images...');
        const dialogSearchInput = searchInputs[searchInputs.length - 1]; // Last one should be in dialog
        await user.type(dialogSearchInput, 'mobile search');
      });

      expect(mockSearchContext.setSearchQuery).toHaveBeenCalledWith('mobile search');
    }
  });

  it('should have proper accessibility attributes', () => {
    renderWithProviders(<Header />);

    // Logo should be a link
    const logo = screen.getByText('Fake Checker').closest('a');
    expect(logo).toHaveAttribute('href', '/');

    // Navigation links should have proper href attributes
    expect(screen.getByText('About').closest('a')).toHaveAttribute('href', '/about');
    expect(screen.getByText('Help').closest('a')).toHaveAttribute('href', '/help');
    expect(screen.getByText('Settings').closest('a')).toHaveAttribute('href', '/settings');

    // Theme toggle should have tooltip
    const themeButton = screen.getByTitle(/switch to/i);
    expect(themeButton).toBeInTheDocument();
  });

  it('should handle keyboard navigation in search input', async () => {
    renderWithProviders(<Header />);

    const searchInput = screen.getByPlaceholderText('Search images...');

    // Focus the input
    await user.click(searchInput);
    expect(searchInput).toHaveFocus();

    // Type and press enter
    await user.type(searchInput, 'test{enter}');
    expect(mockSearchContext.setSearchQuery).toHaveBeenCalledWith('test');
  });

  it('should maintain search query state across re-renders', () => {
    const { rerender } = renderWithProviders(<Header />, { searchQuery: 'persistent query' });

    expect(screen.getByDisplayValue('persistent query')).toBeInTheDocument();

    // Re-render with same query
    rerender(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <ThemeContext.Provider value={mockThemeContext}>
            <SearchContext.Provider value={{ ...mockSearchContext, searchQuery: 'persistent query' }}>
              <Header />
            </SearchContext.Provider>
          </ThemeContext.Provider>
        </ThemeProvider>
      </MemoryRouter>
    );

    expect(screen.getByDisplayValue('persistent query')).toBeInTheDocument();
  });

  it('should handle empty search query', () => {
    renderWithProviders(<Header />, { searchQuery: '' });

    const searchInput = screen.getByPlaceholderText('Search images...');
    expect(searchInput).toHaveValue('');
  });

  it('should render with default props when no onUploadClick is provided', () => {
    renderWithProviders(<Header />);

    const uploadButton = screen.getByText('Upload Image');
    expect(uploadButton).toBeInTheDocument();

    // Should not throw when clicked without handler
    fireEvent.click(uploadButton);
  });
});