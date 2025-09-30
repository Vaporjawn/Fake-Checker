import React, { Suspense, useCallback, useRef, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, Box, CircularProgress, Typography } from '@mui/material';
import Header from './components/Header';
import { HomePage, AboutPage, HelpPage, SettingsPage } from './pages';
// Lazy load AdvancedFeatures component
const AdvancedFeatures = React.lazy(() => import('./components/AdvancedFeatures').then(module => ({
  default: module.AdvancedFeatures
})));
import { SettingsProvider } from './contexts/SettingsContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SearchProvider } from './contexts/SearchContext';
import type { UploadedImage } from './types';

// Skip navigation component for accessibility
const SkipNavigation: React.FC = () => (
  <Box
    component="a"
    href="#main-content"
    sx={{
      position: 'absolute',
      top: -40,
      left: 6,
      zIndex: 1300,
      padding: 1,
      backgroundColor: 'primary.main',
      color: 'primary.contrastText',
      textDecoration: 'none',
      borderRadius: 1,
      '&:focus': {
        top: 6,
      },
    }}
  >
    Skip to main content
  </Box>
);

const App: React.FC = () => {
  const uploadTriggerRef = useRef<(() => void) | null>(null);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);

  const handleUploadClick = useCallback(() => {
    if (uploadTriggerRef.current) {
      uploadTriggerRef.current();
    }
  }, []);

  const setUploadedImagesCallback = useCallback((action: React.SetStateAction<UploadedImage[]>) => {
    setUploadedImages(action);
  }, []);

  // Keyboard shortcuts for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt+U: Focus upload area
      if (event.altKey && event.key === 'u') {
        event.preventDefault();
        const uploadButton = document.querySelector('[aria-label*="upload"]') as HTMLElement;
        if (uploadButton) {
          uploadButton.focus();
        }
      }

      // Alt+S: Focus search (if available)
      if (event.altKey && event.key === 's') {
        event.preventDefault();
        const searchInput = document.querySelector('[aria-label*="search"], [type="search"]') as HTMLElement;
        if (searchInput) {
          searchInput.focus();
        }
      }

      // Alt+M: Focus main navigation
      if (event.altKey && event.key === 'm') {
        event.preventDefault();
        const mainNav = document.querySelector('nav') as HTMLElement;
        if (mainNav) {
          const firstLink = mainNav.querySelector('a, button') as HTMLElement;
          if (firstLink) {
            firstLink.focus();
          }
        }
      }

      // Escape: Clear focus from modals or return to main content
      if (event.key === 'Escape') {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Loading fallback component for lazy-loaded pages
  const PageLoadingFallback = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        gap: 2
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="body2" color="text.secondary">
        Loading page...
      </Typography>
    </Box>
  );

  return (
    <SettingsProvider>
      <ThemeProvider>
        <CssBaseline />
        <Router>
          <SearchProvider images={uploadedImages}>
            <SkipNavigation />
            <Box sx={{
              minHeight: '100vh',
              backgroundColor: 'background.default',
              transition: 'background-color 0.3s ease-in-out'
            }}>
              <Header onUploadClick={handleUploadClick} />

              <Box
                id="main-content"
                component="main"
                tabIndex={-1}
                sx={{
                  width: '100%',
                  '&:focus': {
                    outline: 'none'
                  }
                }}
              >
                <Suspense fallback={<PageLoadingFallback />}>
                  <Routes>
                  <Route
                    path="/"
                    element={
                      <HomePage
                        uploadTriggerRef={uploadTriggerRef}
                        uploadedImages={uploadedImages}
                        setUploadedImages={setUploadedImagesCallback}
                      />
                    }
                  />
                  <Route
                    path="/about"
                    element={<AboutPage />}
                  />
                  <Route
                    path="/help"
                    element={<HelpPage />}
                  />
                  <Route
                    path="/settings"
                    element={<SettingsPage />}
                  />
                  <Route
                    path="/advanced"
                    element={<AdvancedFeatures images={uploadedImages} />}
                  />
                  </Routes>
                </Suspense>
              </Box>
            </Box>
          </SearchProvider>
        </Router>
      </ThemeProvider>
    </SettingsProvider>
  );
};

export default App;
