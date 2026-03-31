# Changelog

## [1.10.0] - 2026-03-30

### Phase 9 — Responsive Layout

**Responsive gameplay shell (`src/layouts/game-layout.tsx`)**

- Added viewport-aware reflow (`MOBILE_LAYOUT_BREAKPOINT = 768`) with `resize` listener.
- Desktop keeps side palette + canvas + right rail; narrow screens reflow to stacked layout with palette moved to a compact bottom strip.
- Added `data-testid="game-layout-shell"` and enforced `overflowX: hidden` to prevent horizontal page scrolling.

**Touch-friendly placement + port targets (`src/components/palette*.tsx`, `src/components/game-canvas.tsx`)**

- `PaletteItem` now supports click/tap placement via `onPlaceComponent` callback in addition to drag-and-drop.
- `GameLayout` queues tap placement requests and passes them to `GameCanvas`.
- `GameCanvas` supports `componentToPlace` + `onComponentPlaced` to place nodes without drag gestures.
- Increased connection handle hit targets to `44x44` (`PORT_HIT_SIZE`) to satisfy touch target minimums.

#### Tests

- `src/components/game-canvas.test.tsx`: added queued-placement test and explicit `44x44` port-hit target assertion.
- `src/components/palette-item.test.tsx`: added click-to-place callback test.
- `src/layouts/game-layout.test.tsx`: added narrow-screen reflow/accessibility assertion.

## [1.9.0] - 2026-03-30

### Phase 8 — Coach and Onboarding

**Coach panel (`src/components/coach.tsx`)**

- Added `Coach` component with concise instructional message surface (`aria-label="Coach"`).
- Shows mission text at level start (`Mission: <objective>`).
- Updates from scheduled level coach timeline messages during simulation ticks.
- Updates on first overload occurrence and on concept unlock events.

**Event Log (`src/components/event-log.tsx`)**

- Added `EventLog` component (`aria-label="Event Log"`) with chronological entries and scrollable list.
- Logs key runtime transitions:
  - component placed
  - connection created
  - concept unlocked
  - overload started
  - overload resolved

**Layout integration (`src/layouts/game-layout.tsx`)**

- Wired `Coach` and `EventLog` into the right rail under `Inspector`.
- Added event generation for graph deltas, unlock transitions, and overload transitions.
- Added level-load resets for coach/event state so each level starts cleanly.

#### Tests

- Added `src/components/coach.test.tsx` and `src/components/event-log.test.tsx`.
- Extended `src/layouts/game-layout.test.tsx` with coverage for:
  - opening mission coach message
  - unlock-driven coach updates
  - overload coach guidance
  - event log entries for placement/connection/unlock/overload start+resolve

## [1.7.0] - 2026-03-30

### Phase 7 — Level System

**Level schema and data (`src/levels/`)**

- `src/levels/types.ts`: `LevelDefinition`, `UnlockTrigger` union (CAPACITY_REACHED, OVERLOAD_SUSTAINED, SERVERS_PLACED, LEVEL_COMPLETE), `CoachMessage`, `ComponentUnlock` interfaces.
- `src/levels/level1–6.ts`: six hand-authored levels with traffic schedules, revenue targets, coach messages, feedback text, and per-level palette.
- Level 3 includes a mid-level `SERVERS_PLACED` unlock that adds Load Balancer to the palette immediately when 2 servers are placed.
- Level 6 introduces Cache with a 70% cache hit rate.

**Unlock trigger evaluator (`src/simulation/unlocks.ts`)**

- `evaluateUnlockTrigger`: pure function for all four trigger types.
- `updateOverloadDurations`: tracks per-node consecutive overload ticks (used for OVERLOAD_SUSTAINED).
- `computeAvailableComponents`: merges base palette with components unlocked by triggers.

**End-of-level screen (`src/components/end-of-level-screen.tsx`)**

- Overlay modal shown when revenue target is reached.
- Shows level title, 1–3 star rating (efficiency-based), earned revenue, 2-3 feedback lines.
- Continue and Replay buttons with handlers wired in the layout.

**localStorage persistence (`src/persistence.ts`)**

- `saveProgress` / `loadProgress` with a `version` field that clears stale data on schema changes.

**Game layout integration (`src/layouts/game-layout.tsx`)**

- Level data drives palette, traffic schedule, revenue target, and coach messages.
- `effectiveLevelConfig` memoised to prevent unnecessary re-renders.
- Tick loop now tracks overload durations and calls `computeAvailableComponents` on each tick.
- `handleGraphChange` re-evaluates SERVERS_PLACED unlock in design mode.
- Win condition: when `revenue >= revenueTarget`, simulation ends, end-of-level screen shown, progress saved.
- Continue advances `currentLevelId`; Replay resets to design mode.

#### Tests

- `src/levels/index.test.ts`: 12 structural tests across all 6 levels.
- `src/simulation/unlocks.test.ts`: 22 unit tests for all trigger types + duration tracking + palette computation.
- `src/components/end-of-level-screen.test.tsx`: 11 tests (heading, title, feedback, star ratings, button callbacks).
- `src/persistence.test.ts`: 6 tests (save/load, version mismatch, malformed data).
- `src/layouts/game-layout.test.tsx`: 5 new integration tests (level 1 palette, end screen shown, replay/continue, localStorage save).

## [1.6.0] - 2026-03-30

### Phase 6 — Inspector Panel

**Inspector panel (`src/components/inspector.tsx`)**

- Added `componentType`, `opsPerSec`, `maxCapacity`, `latencyMs`, and `cost` props.
- Panel now shows component type label, current ops/s (or `—` when no simulation data), capacity (`∞` for unlimited nodes), latency contribution (ms), and cost per hour.
- Load and ops/s fields render in real time during simulation.

**Escape key support (`src/components/game-canvas.tsx`)**

- Pressing Escape deselects the current node and closes the inspector panel.

**Game layout (`src/layouts/game-layout.tsx`)**

- Defined `LATENCY_MS` and `COST_PER_HOUR` constants per component type.
- Passes all new Inspector props derived from simulation state and component metadata.

#### Tests

- `inspector.test.tsx`: added tests for component type label, ops/s, capacity (finite and ∞), latency, and cost fields.
- `game-canvas.test.tsx`: added test verifying Escape key calls `onSelectedNodeChange(null)`.

## [1.5.0] - 2026-03-30

### Phase 5 — Overload Visualisation

**Canvas overload state (`src/components/game-canvas.tsx`)**

- Added explicit overloaded node state via `overloadedNodeIds` and `isOverloaded` node data.
- Overloaded nodes now render with coral fill and animated pulse (`overload-pulse 1.2s ease-in-out infinite`).
- Added keyframes for overload pulse/glow and `data-overloaded` node attribute for deterministic assertions.
- Fixed a render-loop/non-terminating test scenario by using a stable default `overloadedNodeIds` array and no-op guarding in overload state updates.

**Inspector overload feedback (`src/components/inspector.tsx`, `src/layouts/game-layout.tsx`)**

- Inspector now receives selected node label, computed load percentage, and overloaded state from simulation data.
- Load text shows overload status when capacity is exceeded (e.g. `Load: 300% (Overloaded)`).

#### Tests

- Added coverage for overloaded canvas styling/state transitions in `src/components/game-canvas.test.tsx`.
- Added overload text assertions in `src/components/inspector.test.tsx`.
- Added integration coverage in `src/layouts/game-layout.test.tsx` for inspector overload state during simulation.

## [1.4.0] - 2026-03-30

### Phase 4 — Traffic Simulation Engine

**Simulation engine (`src/simulation/`)**

- New `types.ts` defines `GraphNode`, `GraphEdge`, `FlowConfig`, `RevenueConfig`, `NodeTrafficState`, `TrafficSnapshot`, `LevelConfig`, and `SimulationMode`.
- `engine.ts` implements three pure functions:
  - `computeTrafficFlow(nodes, edges, config)` — BFS traversal from `users` nodes; enforces per-node `capacity`, splits traffic evenly across Load Balancer children, and forwards only `(1 - cacheHitRate)` fraction downstream from Cache nodes.
  - `computeRevenue(snapshot, nodes, config)` — sums handled ops at sink nodes and cache-hit ops to produce per-tick revenue.
  - `getTrafficRate(schedule, elapsedSeconds)` — returns the traffic rate for the current simulation time from a step schedule.
- 26 engine tests covering all behaviours.

**Simulation store (`src/store.tsx`)**

- React Context + `useReducer` store with actions `START_SIMULATION`, `TICK`, and `END_SIMULATION`.
- Exposes `mode`, `revenue`, `nodeStates`, `startSimulation`, `endSimulation`, and `tick` via `useSimulation()`.
- Context value memoised with `useMemo` to avoid unnecessary renders.
- 11 store tests.

**Component updates**

- `GameCanvas`: new `isLocked` prop disables drag, drop, and connect interactions during simulation; new `onStateChange` callback fires whenever nodes or edges change.
- `Palette` / `PaletteItem`: new `isDisabled` prop renders items at reduced opacity with drag disabled.
- `TopBar`: new `mode`, `revenue`, and `onStartTraffic` props; displays live balance and toggles button label between "Start Traffic" / "Stop Traffic".

**Layout wiring (`src/layouts/game-layout.tsx`)**

- `SimulationProvider` wraps the entire layout.
- `DEFAULT_LEVEL_CONFIG` defines a 60-second round with a two-phase traffic schedule and a $5 000 revenue target.
- `setInterval` tick loop (1 s) calls `computeTrafficFlow` → `computeRevenue` → `tick`; auto-ends when the timeout elapses or the revenue target is reached.
- `graphRef` captures live canvas state via `onStateChange` without re-triggering the interval effect.
- 4 new simulation-mode tests (fake timers) added to the existing 6 layout tests.

## [1.2.0] - 2026-03-30
# Changelog

## [1.8.0] - 2026-03-30

### Phase 7.5 — Playable Level Runtime

**Level schema extended (`src/levels/types.ts`, `src/levels/level*.ts`)**

- `LevelDefinition` extended with `objectiveText`, `startingNodes`, `startingEdges`, and `lockedNodeIds`.
- `StartingNode` and `StartingEdge` types added for authored initial graph states.
- All six levels populated with a locked `users-1` pre-placed node and per-level objective text.

**`getFirstIncompleteLevel` (`src/persistence.ts`)**

- New exported helper returns the first level not in `completedLevels`, capping at total levels.
- On startup the layout uses this to resume at the player's actual progress rather than always starting at level 1.

**`hasRunnablePath` (`src/simulation/engine.ts`)**

- New exported helper returns `true` when at least one users-type node has an outgoing edge.
- Used by the layout to gate the Start Traffic button.

**`LevelStrip` component (`src/components/level-strip.tsx`)**

- New `<nav aria-label="Level progression">` component showing one button per level.
- `getLevelStatus` util gives each level a `completed | active | locked` status.
- Completed and active levels are clickable; locked levels render disabled.
- Each button carries `data-testid` and `data-status` attributes.

**`TopBar` extended (`src/components/top-bar.tsx`)**

- New props: `levelNumber`, `levelTitle`, `objectiveText`, `revenueTarget`, `startTrafficDisabled`.
- Two-row header: main row (level title, balance, target, button) + optional objective row.
- Start Traffic button is disabled and visually grayed when `startTrafficDisabled && !isSimulating`.

**`GameCanvas` locked nodes (`src/components/game-canvas.tsx`)**

- New `lockedNodeIds` prop; keyed nodes are protected from keyboard-delete and context-menu actions.

**`GameLayoutContent` rewired (`src/layouts/game-layout.tsx`)**

- Initializes `currentLevelId` from persisted progress via `getFirstIncompleteLevel`.
- `levelNodeToCanvasNode` / `levelEdgeToCanvasEdge` converters build `ArchitectureCanvasNode`/`Edge` from authored level data.
- `loadLevel` callback resets graph, selection, overload state, available components, canvas key, and simulation on every level transition.
- `handleContinue` and `handleReplay` both delegate to `loadLevel`.
- `handleSelectLevel` allows jumping to any non-locked level from the strip.
- `isRunnable` computed from live `graphState`; `handleToggleTraffic` is gated — Start Traffic is a no-op when `!isRunnable`.
- `<LevelStrip>` rendered below `<TopBar>`; `<GameCanvas>` receives `key={canvasKey}` for hard remount on level change and `lockedNodeIds` from the current level definition.
- `<TopBar>` receives `levelNumber`, `levelTitle`, `objectiveText`, `revenueTarget`, and `startTrafficDisabled`.

**Tests (191 total, 0 failing)**

- `src/persistence.test.ts`: 5 new tests for `getFirstIncompleteLevel`.
- `src/simulation/engine.test.ts`: 4 new tests for `hasRunnablePath`.
- `src/components/top-bar.test.tsx`: 4 new tests for level context props and disabled state.
- `src/components/level-strip.test.tsx`: 8 new tests (new file).
- `src/components/game-canvas.test.tsx`: 2 new tests for locked-node protection.
- `src/layouts/game-layout.test.tsx`: 14 new tests covering level context UI, startup restore, level progression, simulation gating, and the level strip.


## [1.3.0] - 2026-03-30

### Phase 3 — Port-Based Connections

**Connection ports on nodes**

- `ArchitectureNode` now renders React Flow `Handle` components for outgoing (source) ports on the right and bottom edges, and incoming (target) ports on the left and top edges.
- `Users` node has source handles only — no target handles — so it cannot be the destination of any connection.
- All handles carry `data-testid="handle-{nodeId}-{type}-{side}"` attributes for deterministic tests.

**Connection flow and validation**

- `onConnect` callback on `ReactFlow` uses `addEdge` to create a new animated `architecture-edge` when the user drags from an outgoing port to an incoming port.
- Exported `isConnectionValid(sourceType, targetType)` pure function; connections whose target is `users` are rejected, enforcing the "Users is a source only" rule.
- Pressing Escape during an in-progress connection drag cancels it (React Flow built-in behaviour).

**Animated edges**

- All edges carry `animated: true` (set in `withDefaultEdgeShape`), rendering a moving dash animation that indicates traffic direction along the bezier path.

**Edge deletion**

- `onEdgeClick` marks the clicked edge as `selected: true` in state; pressing Delete then removes the selected edge and hides any open context menu.
- `onEdgeContextMenu` on `ReactFlow` opens an inline Remove context menu at the pointer position; clicking Remove deletes the edge.
- `ContextMenuState` extended to a discriminated union (`kind: "node" | "edge"`) so node and edge context menus share the same rendering path.
- `GameCanvas` accepts an optional `initialContextMenu` prop to pre-seed context menu state (used in tests).

**Tests**

- Added 12 new tests across three new describe blocks: `connection ports` (handle presence, Users target-handle absence), `connection validation` (6 unit tests of `isConnectionValid`), and `edge deletion` (Delete-key removal, context-menu removal).

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
