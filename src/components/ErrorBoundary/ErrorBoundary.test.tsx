import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { ErrorBoundary } from './ErrorBoundary';

// Mock console methods to avoid noise in tests
const originalError = console.error;
const originalGroup = console.group;
const originalGroupEnd = console.groupEnd;

beforeAll(() => {
  console.error = jest.fn();
  console.group = jest.fn();
  console.groupEnd = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.group = originalGroup;
  console.groupEnd = originalGroupEnd;
});

const theme = createTheme();

const ThrowError: React.FC<{ shouldThrow?: boolean; errorMessage?: string }> = ({
  shouldThrow = false,
  errorMessage = 'Test error'
}) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Working component</div>;
};

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

// Mock window.location
const mockLocation = {
  href: '',
  reload: jest.fn(),
};

// Use jest.spyOn to mock location.reload
Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
  configurable: true,
});

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation.href = '';
  });

  it('should render children when there is no error', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should render error UI when an error occurs', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Test error message" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Oops! Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('Application Error')).toBeInTheDocument();
    expect(screen.getByText('Something unexpected happened. We\'re working to fix this issue.')).toBeInTheDocument();
  });

  it('should render custom fallback UI when provided', () => {
    const customFallback = <div>Custom error fallback</div>;

    renderWithTheme(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error fallback')).toBeInTheDocument();
    expect(screen.queryByText('Oops! Something went wrong')).not.toBeInTheDocument();
  });

  it('should call onError callback when error occurs', () => {
    const onError = jest.fn();

    renderWithTheme(
      <ErrorBoundary onError={onError}>
        <ThrowError shouldThrow={true} errorMessage="Test error" />
      </ErrorBoundary>
    );

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Test error'
      }),
      expect.objectContaining({
        componentStack: expect.any(String)
      })
    );
  });

  it('should categorize network errors correctly', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Network fetch error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Network Error')).toBeInTheDocument();
    expect(screen.getByText('There was a problem connecting to our servers. Please check your internet connection and try again.')).toBeInTheDocument();
  });

  it('should categorize API errors correctly', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="API key invalid" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Application Error')).toBeInTheDocument();
    expect(screen.getByText('There\'s an issue with your API configuration. Please check your settings and ensure your API key is valid.')).toBeInTheDocument();
  });

  it('should handle rate limit errors', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Rate limit exceeded" />
      </ErrorBoundary>
    );

    expect(screen.getByText('You\'ve made too many requests too quickly. Please wait a moment and try again.')).toBeInTheDocument();
  });

  it('should handle file size errors', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="File too large" />
      </ErrorBoundary>
    );

    expect(screen.getByText('The file you\'re trying to process is too large. Please try with a smaller image.')).toBeInTheDocument();
  });

  it('should handle unsupported file errors', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Unsupported file format" />
      </ErrorBoundary>
    );

    expect(screen.getByText('This file format is not supported. Please try with a different image format.')).toBeInTheDocument();
  });

  it('should refresh page when refresh button is clicked', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const refreshButton = screen.getByText('Refresh Page');
    fireEvent.click(refreshButton);

    expect(mockLocation.reload).toHaveBeenCalled();
  });

  it('should navigate to home when home button is clicked', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} />
      </ErrorBoundary>
    );

    const homeButton = screen.getByText('Go Home');
    fireEvent.click(homeButton);

    expect(mockLocation.href).toBe('/');
  });

  it('should show technical details when accordion is expanded', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Test error for details" />
      </ErrorBoundary>
    );

    const technicalDetailsButton = screen.getByText('Technical Details');
    fireEvent.click(technicalDetailsButton);

    expect(screen.getByText('Error ID:')).toBeInTheDocument();
    expect(screen.getByText('Error Message:')).toBeInTheDocument();
    expect(screen.getByText('Test error for details')).toBeInTheDocument();
  });

  it('should show retry button for network errors and handle retry click', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="Network error" />
      </ErrorBoundary>
    );

    expect(screen.getByText('Retry')).toBeInTheDocument();

    // Click retry button should trigger window reload
    const retryButton = screen.getByText('Retry');
    fireEvent.click(retryButton);
    expect(mockLocation.reload).toHaveBeenCalled();
  });

  it('should show settings button for API key errors', () => {
    renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="API key error" />
      </ErrorBoundary>
    );

    const settingsButton = screen.getByText('Go to Settings');
    fireEvent.click(settingsButton);

    expect(mockLocation.href).toBe('/settings');
  });

  it('should generate unique error IDs', () => {
    const { rerender } = renderWithTheme(
      <ErrorBoundary>
        <ThrowError shouldThrow={true} errorMessage="First error" />
      </ErrorBoundary>
    );

    fireEvent.click(screen.getByText('Technical Details'));
    const firstErrorId = screen.getByText(/error-/).textContent;

    // Reset the component
    rerender(
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      </ThemeProvider>
    );

    // Trigger another error
    rerender(
      <ThemeProvider theme={theme}>
        <ErrorBoundary>
          <ThrowError shouldThrow={true} errorMessage="Second error" />
        </ErrorBoundary>
      </ThemeProvider>
    );

    fireEvent.click(screen.getByText('Technical Details'));
    const secondErrorId = screen.getByText(/error-/).textContent;

    expect(firstErrorId).not.toBe(secondErrorId);
  });
});