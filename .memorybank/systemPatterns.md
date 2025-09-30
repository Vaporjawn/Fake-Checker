# System & Architectural Patterns

Observed Patterns:
- React functional components with context providers for cross-cutting state (SearchContext, SettingsContext, ThemeContext).
- Services abstraction layer for AI, image processing, storage, and error handling.
- Theming via `theme/theme.ts` (likely MUI or custom design tokens—needs confirmation by reading file when required).
- Separation of pages vs components; index barrel in `pages/index.ts`.

Potential Improvements (to validate):
- Introduce a clear state management strategy if complexity grows (Zustand / Redux Toolkit) vs multiple contexts.
- Add domain typing & result interfaces in `types/` (currently minimal `index.ts`).
- Strengthen error boundary coverage & logging (observed ErrorBoundary component).
- Testing: Only minimal simple test utilities; expand unit + integration + E2E (Playwright) pipeline.
# System Patterns & Architecture Notes

## Observed Patterns
- React functional components with context-based state (SettingsContext, ThemeContext, SearchContext).
- Service abstraction layer (imageProcessingService, storageService, aiDetectionService) suggesting future separation of concerns.
- Theming centralization under `theme/theme.ts`.
- Component modularization (ErrorBoundary, ImageGrid, UploadArea, Header, ThemeDemo).

## Suggested Patterns To Introduce
- Feature folder pattern for future detection results & reports.
- Error boundary wrapping at route or feature boundaries.
- Centralized types in `types/` already started—extend for service contracts.
- Adapter pattern for AI providers (local vs external API) behind aiDetectionService.
- Hook-based data loaders (e.g., useImages, useDetectionResult).

## Testing Patterns
- Current: Jest + setupTests + simple util test.
- Add: React Testing Library component tests, hook tests with custom render wrappers using providers.
- Future: Visual regression (Playwright) & performance benchmarks for large image sets.
