# Tech Context

Stack:
- Vite
- React + TypeScript
- Jest (config present) for unit tests
- ESLint config & TS configs (`tsconfig.*`)

Not Yet Confirmed:
- UI library (need to inspect theme file for MUI/Chakra/custom).
- No explicit backend here—pure frontend implementation.

Tooling Gaps / Opportunities:
- Add Prettier integration (if not already implicitly configured) & CI checks.
- Consider adding Playwright for E2E.
- Consider GraphQL/REST client abstraction if external API to be integrated.
# Tech Context

Stack: Vite, React, TypeScript, Jest, ESLint.

## Build & Tooling
- Vite for fast dev & build.
- TypeScript configs separated (base, app, node) enabling potential SSR/tool scripts later.
- ESLint custom config present.

## Testing
- Jest configured (setup files). Coverage artifacts present in `/coverage`.

## Theming & UI
- Custom theme file; likely extendable to MUI or other design system if needed later.

## Gaps / Technical Debt (Inferred)
- No API layer or network abstraction.
- No persistent storage strategy (localStorage? backend?).
- Services are mostly placeholders; limited error handling.
- Limited test coverage beyond utilities.
