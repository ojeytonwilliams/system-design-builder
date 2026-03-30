# Changelog

## [1.2.0] - 2026-03-30

### Phase 2 — Game Canvas

**Component library**

- Added `src/components/component-library.ts` — shared catalogue of all five component types (`users`, `server`, `db`, `cache`, `load-balancer`) with accent colours, icons, and labels; exports `PHASE_TWO_AVAILABLE_COMPONENTS` and `isComponentType` helper.

**Game canvas**

- Added `src/components/game-canvas.tsx` — React Flow canvas with a dotted off-white grid background (`BackgroundVariant.Dots`); fills its container at 100 % width/height.
- Drop zone accepts dragged palette items via HTML5 drag-and-drop; dropped nodes are snapped to a 48 px grid and rendered as custom `ArchitectureNode` elements showing an icon and label.
- Clicking a node selects it (highlighted border); pressing Delete removes it and all connected edges.
- Right-clicking a node shows an inline Remove context menu that performs the same deletion.
- Node positions are also snapped on drag-stop.
- Exported `snapPositionToGrid` pure helper for testing.

**Palette**

- Added `src/components/palette-item.tsx` — draggable button that sets `application/component-type` on `dataTransfer`; includes `data-testid` and `data-component-type` attributes.
- Updated `src/components/palette.tsx` — accepts optional `availableComponents` prop; renders a `PaletteItem` for each entry or a placeholder when the prop is absent.

**Layout**

- Updated `src/layouts/game-layout.tsx` — mounts `<GameCanvas />` in the canvas area and passes `PHASE_TWO_AVAILABLE_COMPONENTS` to `<Palette />`.

**Tests**

- Added/extended tests for `GameCanvas` (7 tests), `PaletteItem` (4 tests), and `Palette` (5 tests).
- Moved `ResizeObserver` stub into `test-setup.ts` so all test files share it automatically.
- 25 tests total, all passing.

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
