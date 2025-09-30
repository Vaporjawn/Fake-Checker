import { lazy } from 'react';

// Lazy load pages for better performance
export const HomePage = lazy(() => import('./HomePage'));
export const AboutPage = lazy(() => import('./AboutPage'));
export const HelpPage = lazy(() => import('./HelpPage'));
export const SettingsPage = lazy(() => import('./SettingsPage'));