# Changelog

## [2.3.19] - 2026-05-19

### Refactoring

- **`canvas-state.ts` contained reducer logic without a reducer, and `graphState` was mutated with coarse, semantically opaque `setGraphState` calls**: Every `GameCanvas` event handler manually assembled a `CanvasGraph` from four pieces of scattered state, passed it through a pure transition function, then re-split the result across three destinations (`onStateChange`, `onSelectedNodeChange`, `setContextMenu`). Meanwhile `handleGraphChange` in `GameScene` closed over `graphState` to compute a diff for the event log, forcing it to be recreated on every canvas edit and producing unnecessary re-renders. Replaced this with two reducers. `graphReducer` (`src/game/graph-reducer.ts`) owns nodes and edges in `GameScene` via `useReducer`; its actions — `PLACE_NODE`, `ADD_EDGE`, `MOVE_NODE`, `REMOVE_NODE`, `REMOVE_EDGE`, `LOAD_LEVEL` — carry domain logic (connection validation, ID generation, cascading deletion) that previously lived in `canvas-state.ts`. `dispatchGraph` is passed as a prop to `GameCanvas`, replacing the `onStateChange` callback. `canvasUIReducer` (`src/game/canvas-ui-reducer.ts`) owns `{ contextMenu, selectedEdgeId }` locally in `GameCanvas`; `selectedEdgeId` replaces the `selected` boolean that was embedded in edge objects, separating UI selection state from graph topology. Fine-grained actions make the intent at each call site explicit; cross-cutting actions (e.g. place node + clear selection) double-dispatch to both reducers — React 18 batches these into a single render. Event log entries are fired directly at dispatch time via `onNodePlaced` / `onEdgeCreated` callbacks, eliminating the diff-based `handleGraphChange` and the `previousGraphRef` workaround it required. `canvas-state.ts` and its tests are deleted; behaviour is covered by the new reducer test suites.

## [2.3.18] - 2026-05-19

### Refactoring

- **Game phase was split across two scopes with no defined transitions**: `SimulationMode` (`"DESIGN" | "SIMULATE"`) lived in the simulation context while `showEndScreen` lived as local component state, together encoding the phase implicitly. There was no `FAILED` phase — a simulation timeout silently dropped the player back to design mode with no feedback. Invalid transitions (e.g. `handleWin` firing when already on the end screen) were caught by defensive checks scattered across hooks. Introduced a `phaseReducer` pure function in `src/game/phase-machine.ts` with four explicit phases (`DESIGN`, `SIMULATING`, `WON`, `FAILED`) and five named actions; invalid transitions are no-ops by construction rather than guarded at every call site. `GameScene` owns the phase via `usePhase` (`useReducer` over the pure reducer) and derives `isSimulating` from it. `SimulationMode` is removed — `TopBar` and `useDesignModeOverloads` now accept `isSimulating: boolean` directly. The simulation store is simplified to tick data only (`currentTrafficRate`, `nodeStates`, `resetSimulation`); `startSimulation` and `endSimulation` are gone. The reducer is tested as a plain function with no React rendering required.

## [2.3.17] - 2026-05-19

### Refactoring

- **`GameLayout` accepted three props that were only ever passed in tests, leaking test seams into the public API**: `initialEdges`, `initialNodes`, and `levelConfig` were never supplied by any production call site — they existed solely so integration tests could inject specific traffic configs and graph states. This forced the component to handle two execution paths and spawned `resolveEffectiveLevelConfig` purely to reconcile the injected value with the level definition when no prop was given. Extracted `GameScene` (the former `GameLayoutContent`) as an exported component with explicit required props; `GameLayout` is now a zero-prop orchestrator that calls `useLevel()`, derives the level config from the current level, and wires everything into `GameScene` inside `SimulationProvider`. Tests that need scenario-specific configs or graphs render `GameScene` directly; the two tests that require real level-progression state (persistence and level transitions) use a `GameSceneHarness` wrapper that supplies a live `useLevel()` hook. `resolveEffectiveLevelConfig` and its test were deleted — there is no longer an optional override to resolve.

## [2.3.16] - 2026-05-18

### Refactoring

- **Level logic was scattered across module-scope closures, damaging testability**: `getLevelById`, `getLevelNumber`, `isLevelUnlocked`, and `getFirstIncompleteLevel` all closed over the module-level `LEVELS` array, so mocking the exported `LEVELS` in tests had no effect on their behaviour. Converted `src/levels/index.ts` into a `LevelRegistry` class whose methods operate on `this.levels`, and exported a `levelRegistry` singleton constructed with the real levels. Tests can now inject a different array via `new LevelRegistry(testLevels)` without re-implementing any logic. Removed the redundant `LEVELS` export — all call sites use `levelRegistry.levels` instead.
- **Test fixtures extracted for level unit tests**: Added `src/levels/test-fixtures.ts` with three minimal but complete `LevelDefinition` objects. `level-strip.test.tsx` and the `LevelRegistry` describe block in `index.test.ts` now use the fixture, removing the dependency on real level content and eliminating the `vi.hoisted` workaround and its associated lint-disable comment.
- **`game-layout.test.tsx` moved to `src/integration-tests/`**: The file was co-located with `game-layout.tsx` as if it were a unit test, but it renders the full game with real dependencies (simulation engine, level registry, persistence, component unlocks). Moving it to the integration-tests directory makes the distinction explicit per project conventions.

## [2.3.15] - 2026-05-18

### Refactoring

- **Level IDs were sequential integers, making level ordering load-bearing**: The "next level" was computed as `currentLevel.id + 1`, which silently broke whenever levels were added, removed, or reordered. Persisted progress stored the same integers, so any reordering would corrupt a player's save. Replaced all six level IDs with stable nanoid strings. `getFirstIncompleteLevel` now receives an ordered list of IDs instead of a total count; `handleContinue` uses index-based lookup instead of arithmetic; `getLevelById` accepts a string. The display label (`1`, `2` … `6`) is derived from array position at render time, so visual ordering remains correct without coupling it to identity.
- **`scripts/new-level.mjs` added**: New scaffolding script generates a level file with a pre-assigned nanoid and prints the import line needed for `src/levels/index.ts`, eliminating the manual ID-assignment step when authoring a new level.

## [2.3.14] - 2026-05-18

### Refactoring

- **`useSimulationTick` read stale props through an ever-growing dependency array**: The interval callback inside the simulation tick `useEffect` closed over `nodes`, `edges`, `currentLevel`, `effectiveLevelConfig`, and six callbacks, forcing all of them into the dependency array and risking either stale reads or spurious interval restarts if any value changed mid-simulation. Extracted the callback body into `useEffectEvent`, which reads its captured values at call time without being reactive to them. The `useEffect` dependency array now contains only the three values that should actually restart the interval: `mode`, `resetKey`, and `effectiveLevelConfig`.

## [2.3.13] - 2026-05-15

### Refactoring

- **`PixiNode` and `PixiEdge` were misnamed, structurally redundant, and leaked dead fields throughout the codebase**: `PixiNode` had nothing to do with Pixi — it was the canonical canvas node type. Its `data: { componentType }` wrapper existed only to satisfy a React Flow convention that this project never used, forcing a `level-canvas-adapters` module to translate `StartingNode` into `PixiNode` on every level load. Both types also carried fields that were never read: `PixiNode.type` was always the constant `"architecture"`; `ArchitectureNodeData.isOverloaded` and `isSelected` were computed externally from `overloadedNodeIds`/`selectedNodeId` and never written to the node object; `PixiEdge.animated` was always `false`; `PixiEdge.type` was set but never read. `StartingNode.label` was populated in every level definition but discarded by the adapter because labels come from `COMPONENT_LIBRARY`. Renamed `PixiNode` → `ArchitectureNode` and `PixiEdge` → `ArchitectureEdge`, flattened `componentType` onto the node directly, stripped all dead fields, deleted `level-canvas-adapters.ts`, and updated `LevelDefinition` to use the canvas types directly so level data can be used on the canvas with no conversion.

## [2.3.12] - 2026-05-15

### Refactoring

- **Speculative type exports created a misleading public API**: 31 types and 2 functions were exported from source modules but never imported outside their own file — mostly props interfaces and hook result types that were exported by habit rather than need. Two functions (`closeContextMenu`, `setEdgesAnimated`) existed only as test targets with no production call sites, so they were deleted along with their tests. Removed all unused exports to make the actual API surface match what the codebase uses.

## [2.3.11] - 2026-05-15

### Refactoring

- **`GameCanvas` maintained a private copy of the graph that diverged from `GameLayoutContent`**: `GameCanvas` owned `nodes`, `edges`, and `selectedNodeId` as internal state and only notified the parent via `onStateChange`/`onSelectedNodeChange` effects. This left `GameLayoutContent`'s `graphState` perpetually stale — budget calculations, design-mode overload detection, and the simulation tick all ran against data from the last level load rather than the live canvas. Converted `GameCanvas` to a fully controlled component: `nodes`, `edges`, and `selectedNodeId` are now required props owned by `GameLayoutContent`; only the context menu (an ephemeral UI detail the parent has no use for) remains internal. `handleGraphChange` now calls `setGraphState` so the parent is the single source of truth. The vestigial `setEdgesAnimated` effect was also removed — the renderer drives animation from its `isSimulating` prop, not an `animated` flag on edges.

## [2.3.10] - 2026-05-15

### Refactoring

- **`GameLayoutContent` still held all its event handlers inline**: Even after extracting custom hooks in v2.3.4, the component body retained ten `useCallback` declarations (level loading, traffic toggling, graph changes, budget checks, etc.) alongside a `graphRef` mutable ref and two `useMemo` computations. Extracted the callbacks into `useGameActions`, the design-mode overload calculation into `useDesignModeOverloads` (with its own unit tests), and the level-config fallback logic into a pure `resolveEffectiveLevelConfig` utility (also unit-tested). Removed `graphRef` — it existed to avoid stale closures inside the simulation tick interval, but the canvas is locked during simulation so the graph cannot change while the interval runs; `nodes` and `edges` are passed as plain values instead.

## [2.3.9] - 2026-05-15

### Refactoring

- **Node drag position was split across React state and mutable Pixi container refs**: During a drag, node positions were updated by directly mutating `container.x/y` on Pixi `Container` objects stored in a `nodeContainerRefs` map. This was invisible to React, so a separate `setDragFrame` ticker hack was needed to force edge re-renders. Replaced with a single `dragPos` React state that updates on every pointer move, from which `liveNodes` is derived and passed down. `nodeContainerRefs` and `setDragFrame` are gone; edges follow dragged nodes because React's render cycle now drives all position updates.

## [2.3.8] - 2026-05-15

### Refactoring

- **Three-layer canvas architecture**: Separated the canvas into three distinct layers with clear responsibilities. (1) `canvas-state.ts` — a pure logic layer with 14 immutable reducer-style transition functions (`placeNode`, `selectNode`, `addEdge`, `removeSelectedNode`, etc.) that transform a `CanvasGraph` value with no side effects or React coupling. (2) `game-canvas.tsx` — a thin React shell that owns a single `useState<CanvasGraph>`, calls transition functions in response to events, and delegates all rendering to the Pixi layer. (3) `canvas-pixi-renderer.tsx` — the sole file that imports from `pixi.js` and `@pixi/react`, now handling `pendingEdge` drag state internally rather than leaking it to the shell.
- **Deleted `canvas-node-graphic.tsx` and `canvas-edge-graphic.tsx`**: Their logic was consolidated into `canvas-pixi-renderer.tsx`, reducing cross-file coupling and keeping all Pixi interaction in one place.
- **Pure logic is now independently tested**: `canvas-state.test.ts` covers all 14 transition functions with 46 unit tests against plain objects — no DOM, no React, no Pixi mocks required.

## [2.3.7] - 2026-05-14

### Refactoring

- **Tests were targeting a hidden DOM mirror instead of the real canvas**: `DomMirror` was a hidden `<div>` that duplicated every node and edge purely so tests could find them with `getByTestId`. This made tests pass while the real Pixi canvas remained untestable. Removed `DomMirror` and replaced it with proper mocks for `pixi.js` and `@pixi/react` in `test-setup.ts` (via `vitest-canvas-mock`). `data-testid`, `data-label`, and `data-overloaded` attributes are now placed on the actual Pixi container elements, so tests exercise the real component tree.
- **Context menu callbacks no longer leak PixiJS internals**: The `onNodeContextMenu` and `onEdgeContextMenu` callbacks previously accepted a raw `FederatedPointerEvent`. Callers had to know about Pixi's `e.client.x/y` API, and tests couldn't fire these without a real Pixi event. The signatures now accept a plain `{ clientX: number; clientY: number }` object, and the Pixi-specific extraction happens at the call site inside the graphics components.

## [2.3.6] - 2026-05-14

### Bug fixes

- **First page load showed the wrong level after completing level 1**: `useLevel` deferred reading `localStorage` to a `useEffect`, which meant the first render always started at level 1. When the effect fired and updated `currentLevelId`, the level text changed but `levelStartNodes`, `levelStartEdges`, `graphState`, `coachMessage`, and `availableComponents` were still initialised from level 1 — producing a broken intermediate state with mismatched content. Fixed by switching Astro's hydration directive from `client:load` to `client:only="react"`, which skips server rendering entirely and removes the hydration-mismatch concern that necessitated the deferred read. `useLevel` now reads `localStorage` in lazy `useState` initialisers, so the correct level is available on the very first render.

## [2.3.5] - 2026-05-14

### Refactoring

- **`game-canvas.tsx` maintained its own duplicate component library**: `CANVAS_COMPONENT_LIBRARY` held the same labels, icons, and accent colours that already existed in `component-library.ts`, but with slightly different labels (e.g. `"Server"` vs `"Small Server"`) and numeric hex colours instead of CSS strings. Removed the duplicate and replaced all usages with `COMPONENT_LIBRARY` from `component-library.ts`, making that file the single source of truth for component metadata. PixiJS accepts CSS colour strings natively, so no conversion was needed.

## [2.3.4] - 2026-05-14

### Refactoring

- **`game-layout.tsx` was doing too much**: A single 675-line component owned level management, event logging, component unlocks, simulation ticking, inspector data derivation, and layout detection — making each concern hard to test or reason about in isolation. Extracted six custom hooks (`useLevel`, `useEventLog`, `useComponentUnlocks`, `useSimulationTick`, `useInspectorData`, `useCompactLayout`) and two adapter modules (`graph-adapters`, `level-canvas-adapters`), reducing `game-layout.tsx` to 391 lines and dropping cyclomatic complexity from 26 to 11.
- **`overloadDurations` write-only state smell fixed**: The original code called `setAvailableComponents` inside a `setOverloadDurations` functional updater to get the latest previous value — a pattern that hides causality. `useComponentUnlocks` now owns `overloadDurations` as an internal ref and exposes a clean `applySnapshot` / `updateFromGraph` / `resetForLevel` API.
- **`latencyMs` moved into `component-library.ts`**: Component latency values were stored in a separate `LATENCY_MS` constant in the layout file while every other per-component property (`capacity`, `monthlyCost`) already lived in `COMPONENT_LIBRARY`. Consolidating them removes the inconsistency and makes the component definition the single source of truth.

## [2.3.3] - 2026-05-12

### Bug fixes

- **Node drag snaps to every other dot**: `GRID_SIZE` was 48px while the background dot grid renders every 24px, making nodes appear to jump two squares at a time. Reduced `GRID_SIZE` to 24px to match the visible grid. Starting node positions across all six levels updated to align to the corrected grid.

## [2.3.2] - 2026-05-12

### Bug fixes

- **Edge endpoints after drag snap**: When a node was dragged and snapped back to its original grid cell, React's reconciler saw no prop change and skipped updating the Pixi container, leaving it at the mid-drag position while edges calculated their endpoints from the (unchanged) state position. Edges therefore missed the handles after drop. Fixed by explicitly writing the snapped coordinates back to the container immediately in `onStagePointerUp`, before the React state update.

## [2.3.1] - 2026-05-11

### Bug fixes — Pixi canvas interaction

- **Dashed edge rendering**: Replaced a non-existent `setStrokeDash` API call with a `drawDashedBezier` utility that samples the cubic bezier into line segments and alternates draw/skip based on the dash pattern and animated offset.
- **SSR hydration mismatch**: Deferred `localStorage` reads to `useEffect` so the server render and initial client render both start with Level 1, eliminating the hydration mismatch.
- **Pixi app initialisation guard**: `useApplication()` returns `isInitialised`; the stage event-listener effect now bails out until `isInitialised` flips to `true` and `app.screen` is available.
- **Maximum update depth during drag**: Replaced `setNodes` on every `pointermove` with direct Pixi container mutation; container refs are stored in a `Map` and the snapped position is committed to React state only on `pointerup`.
- **Live edge redraw during drag**: New `EdgesLayer` sub-component owns `useTick` and re-renders edges each animation frame by reading live container positions, without triggering `PixiNodeGraphic` re-renders that would reset the dragged container.
- **Duplicate node IDs**: Fixed ID collision when a level pre-places a node whose id clashes with a freshly dropped component (e.g. `db-1` alongside `componentType: db-large`) by iterating the full set of used IDs instead of counting by component type.
- **Stale closure in connection handler**: `onHandleClick` now reads `nodes` and `pendingEdge` from refs so the callback is stable (empty deps) and never holds a stale closure over React state.
- **Drag-to-connect gesture**: Source handles trigger on `pointerdown`; target handles trigger on `pointerup`; drag-to-connect and click-to-connect both work.
- **Node drag when clicking a handle**: `draggingRef` is cleared at the start of `onHandleClick` (source branch) to cancel the drag accidentally started during Pixi's capturing phase before `stopPropagation` takes effect.
- **Releasing dragged nodes over target handles**: Target handle `onPointerUp` only stops propagation when a connection is in progress (`isPendingConnection`); otherwise the event bubbles to commit the drag.
- **Duplicate event-log keys**: The event id is captured before entering the React state updater, so rapid back-to-back calls no longer share the same counter value.

## [2.3.0] - 2026-05-11

### Phases 3–5 — Interaction, simulation visuals, and test rewrite

- **Drop zone + queued placement**: Preserved `onDragOver`/`onDrop` and the `componentToPlace` `useEffect`; nodes snap to 48px grid on drop; `onComponentPlaced` fires after placement; `isLocked` blocks new drops.
- **Node dragging with grid snap**: `pointerdown`/`pointerup` on node containers commits final snapped position to state via `snapPositionToGrid`; locked nodes are non-draggable.
- **Two-phase connection**: Clicking a source handle sets `pendingEdge` state and renders a `LiveEdgeGraphic` dashed preview; clicking a valid target handle commits the edge; Escape or canvas click cancels.
- **Node and edge selection**: Clicking a node sets `selectedNodeId` and calls `onSelectedNodeChange`; clicking an edge marks it `selected`; clicking the background or pressing Escape clears all selection.
- **Context menu DOM overlay**: Right-click on a non-locked node/edge shows an absolutely positioned "Remove" button; removing a node also deletes its connected edges; locked nodes suppress the context menu.
- **Keyboard shortcuts**: Delete removes the selected node (and its edges) or selected edge; Escape clears selection and cancels any pending connection; listener cleaned up on unmount.
- **Animated dashed edges**: `useTick` advances `dashOffset` each frame when `isSimulating`; edges draw with a `[6, 6]` moving dash pattern; solid lines when not simulating.
- **Overloaded node glow**: Nodes in `overloadedNodeIds` render an extra behind-border rounded rect at `alpha: 0.5` in `#e5634d`; glow removed when no longer overloaded.
- **Test rewrite**: All 33 tests use DOM mirror `data-testid` elements and callback-level assertions; no React Flow-specific DOM dependencies; all tests pass in jsdom without a canvas package.

## [2.2.0] - 2026-05-11

### Phase 2 — Static graph: nodes and edges rendered without interaction

- **Graph geometry utilities**: Implemented `getHandlePosition(node, side)`, `chooseBestHandles(source, target)`, and `getBezierControlPoints(src, tgt)` as pure functions replacing React Flow's `getBezierPath` and handle anchor logic. `chooseBestHandles` is now exported for unit testing.
- **`PixiNodeGraphic` component**: Renders each node as a `<pixiContainer>` with a rounded-rect background (88×96px, 16px radius), an icon pill with emoji, and a label. Selected nodes use `#fff3ea` fill and `#e5634d` border; overloaded nodes use `#ffe4dd` fill with a thicker coral stroke.
- **`HandleGraphic` component**: Renders connection handles as invisible 22px-radius hit circles with a visible 4px dot at `#7b8cb2`. Source handles on right/bottom; target handles on left/top. `users` nodes omit all target handles.
- **`PixiEdgeGraphic` component**: Draws each edge as a cubic bezier curve via `g.bezierCurveTo()`; selected edges use coral (`#e5634d`) at width 3, others use `#7b8cb2` at width 2. Includes a manual arrowhead triangle at the target end.
- **Hidden DOM mirror**: Node and edge `data-testid` elements are rendered as zero-size hidden `<div>`s for test compatibility in jsdom.

## [2.1.0] - 2026-05-11

### Phase 1 — Pixi scaffold with dot grid background

- **PixiJS application**: Replaced the `<ReactFlow>` wrapper with a `@pixi/react` `<Application>` that mounts when the dropzone has non-zero dimensions (tracked via `ResizeObserver`), filling its container and resizing automatically.
- **Pixi component registration**: `extend({ Container, Graphics, Text })` registers Pixi JSX element types at module load time.
- **Local type definitions**: Defined `PixiNode` and `PixiEdge` types locally in `game-canvas.tsx`; `PixiEdge` is re-exported as `Edge` for backwards compatibility. Updated `game-layout.tsx` and its test to import `Edge` from `game-canvas.js` rather than `@xyflow/react`.
- **Dot grid background**: A `<pixiGraphics>` draw callback renders a regular grid of dots (`BACKGROUND_GAP = 24px`, radius `0.8px`, colour `#1a2744` at 18% opacity); the grid redraws whenever stage dimensions change.

## [2.0.0] - 2026-03-31

### Phases 10–13 — Resources Panel, Budget System, Traffic Redesign & Failing Start States

- **Resources panel**: Renamed "Palette" to "Resources"; each entry now shows monthly cost (`$20/mo`), capacity (`50 req/s`), and a plain-English description. Users node removed from the panel.
- **Two server sizes**: Added Small Server (50 req/s, $20/mo) and Large Server (150 req/s, $80/mo) as distinct component types, along with Small DB (30 req/s, $15/mo) and Large DB (90 req/s, $50/mo).
- **Per-level budget**: Each level now defines a monthly infrastructure budget displayed in the top bar. Placing a component deducts its cost; budget enforcement blocks placement with a coach message when funds are exhausted.
- **Linear traffic ramp**: Replaced scripted traffic schedules with a `trafficStart → trafficPeak` linear ramp over the level timeout. Engine function `getLinearTrafficRate` computes the current rate each second.
- **req/s win condition**: Removed revenue-based win; the level is won when the system sustains `trafficTarget` req/s for a continuous 10-second window with zero dropped requests.
- **Live req/s display**: Top bar now shows current req/s and traffic target at all times.
- **Budget-efficiency star score**: End-of-level screen awards 1–3 stars based on remaining budget headroom (≥50% = 3★, ≥20% = 2★, <20% = 1★).
- **Failing start states**: All 6 levels redesigned to begin in a broken, overloaded state; players diagnose and fix the architecture rather than building from scratch.
- **Design-mode overload preview**: Static capacity check at `trafficStart` rate marks overloaded nodes in red before simulation begins.
- **Coach messages updated**: All level coach messages now describe the failing component and suggest a corrective action.

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
