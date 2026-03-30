# Changelog

## [1.1.0] - 2026-03-30

### Phase 1 — Project Scaffold

**Project scaffold**

- Added `@xyflow/react`, `@astrojs/react`, `react`, `react-dom` as production dependencies.
- Added `@types/react`, `@types/react-dom`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` as dev dependencies.
- Added `src/pages/index.astro` as the game entry point, rendering `GameLayout` as a React island.
- Added `test-setup.ts` at the project root to import `@testing-library/jest-dom` matchers.
- Updated `vitest.config.ts` to enable the `jsdom` environment and register the test setup file.
- Updated `tsconfig.json` to include `@testing-library/jest-dom` in the types array.
- Added `.prettierignore` to exclude inaccessible system files from `oxfmt`.

**Quality tooling**

- Updated `.oxlintrc.json`: disabled `react/react-in-jsx-scope` (React 17+ automatic JSX runtime) and set `react/jsx-max-depth` max to 5.

**App shell layout**

- Added `src/layouts/game-layout.tsx` — full-viewport flex layout composing TopBar, Palette, canvas placeholder, and Inspector.
- Added `src/components/top-bar.tsx` — dark navy header with title, `$500` cash balance, and Start Traffic button.
- Added `src/components/palette.tsx` — left panel with "Palette" heading and placeholder text.
- Added `src/components/inspector.tsx` — right panel with "Inspector" heading and placeholder text.
- Added corresponding test files for all four components (10 tests total).

**Documentation**

- Added `README.md` with install, dev, test, lint, and format commands for new contributors.
- Marked all Phase 1 todo items as complete in `design/todo.md`.
