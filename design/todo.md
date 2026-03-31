# TODO

## Phase 1: Project Scaffold

- [x] CODE: Initialise project scaffold
  - Feature: Create the Astro + React project with TypeScript and pnpm.
  - Files: `package.json`, `pnpm-lock.yaml`, `astro.config.*`, `tsconfig.json`
  - Acceptance:
    - Running the documented start command launches a local dev server.
    - React and React Flow are installed as dependencies.
    - Opening the local URL displays a non-blank page.

- [x] CODE: Configure quality tooling
  - Feature: Add lint, format, and test tooling.
  - Files: `package.json`, Vitest config, ESLint config, Prettier config
  - Acceptance:
    - `pnpm test` runs Vitest successfully.
    - `pnpm lint` runs ESLint successfully.
    - `pnpm format --check` runs Prettier successfully.

- [x] CODE: Build app shell layout
  - Feature: Implement the top-level UI layout: top bar (with Start Traffic button and cash balance), left palette panel, central canvas area, right inspector panel.
  - Files: `src/layouts/GameLayout.*`, `src/components/TopBar.*`, `src/components/Palette.*`, `src/components/Inspector.*`
  - Acceptance:
    - All four regions render on load with placeholder content.
    - Top bar includes a Start Traffic button and a cash balance display.
    - Layout is responsive across desktop and mobile in portrait and landscape.
    - No game logic is wired up yet.

- [x] TASK: Document local run workflow
  - Acceptance:
    - A new contributor can install, start, lint, and test the project from a clean checkout using pnpm commands.

---

## Phase 2: Game Canvas

- [x] CODE: Render dotted-grid canvas with React Flow
  - Feature: Display an empty React Flow canvas styled as an off-white dotted grid.
  - Files: `src/components/GameCanvas.*`, global styles
  - Acceptance:
    - Canvas renders a visible dotted-grid background matching the art direction in `image.png`.
    - Canvas fills its container and responds to window resize.
    - React Flow background pattern is used for the grid.

- [x] CODE: Implement palette with draggable components
  - Feature: Palette lists available components; each can be dragged onto the canvas.
  - Files: `src/components/Palette.*`, `src/components/PaletteItem.*`
  - Acceptance:
    - Palette displays only the components available for the current level.
    - Dragging a palette item and dropping it on the canvas places a node at the drop position.
    - Dropped nodes snap to the nearest grid cell.
    - Each node displays its icon and label beneath it.

- [x] CODE: Implement node deletion
  - Feature: A placed node can be selected and deleted along with all its connections.
  - Files: `src/components/GameCanvas.*`, node types
  - Acceptance:
    - Selecting a node and pressing Delete removes it and all connected edges.
    - Right-clicking a node and choosing Remove achieves the same result.
    - The canvas remains in a valid state after deletion.

---

## Phase 3: Port-Based Connections

- [x] CODE: Add connection ports to nodes
  - Feature: Each node exposes outgoing and incoming ports as small circles on its edges.
  - Files: custom React Flow node components
  - Acceptance:
    - Outgoing ports appear on the right/bottom edge of each node.
    - Incoming ports appear on the left/top edge.
    - Users node has outgoing ports only.
    - DB and Cache have no outgoing port that leads to Users.
    - Ports are visible on hover (or always-on — to be decided in implementation).

- [x] CODE: Implement port-click connection flow
  - Feature: Clicking an outgoing port begins a connection drag; clicking an incoming port completes it.
  - Files: `src/components/GameCanvas.*`, edge types
  - Acceptance:
    - Clicking an outgoing port shows a pending edge following the cursor.
    - Clicking a valid incoming port creates an animated directed edge between the two nodes.
    - Clicking an invalid target (e.g. Users as destination for DB) does not create a connection.
    - Pressing Escape cancels an in-progress connection.
    - A node may have unlimited connections.

- [x] CODE: Render animated flow edges
  - Feature: Connections are displayed as light animated React Flow edges indicating traffic direction.
  - Files: custom React Flow edge component
  - Acceptance:
    - Edges animate in the direction of traffic flow.
    - Edge animation speed or density visually reflects the request rate passing through it.
    - Edges into an overloaded node appear thicker/crowded compared to normal edges.

- [x] CODE: Implement edge deletion
  - Feature: An edge can be selected and removed.
  - Files: custom React Flow edge component
  - Acceptance:
    - Clicking an edge then pressing Delete removes it.
    - Right-clicking an edge and choosing Remove achieves the same result.

---

## Phase 4: Traffic Simulation

- [x] CODE: Implement traffic simulation engine
  - Feature: Model traffic as a request rate (ops/sec) that flows through the graph and grows on a scripted timer. The simulation runs automatically and stops on its own — no manual stop control needed.
  - Files: `src/simulation/engine.*`, `src/simulation/types.*`
  - Acceptance:
    - The simulation has two modes: **design** (canvas editable, no traffic) and **simulate** (traffic running, canvas locked).
    - Pressing Start Traffic transitions to simulate mode and begins the run.
    - The simulation ends automatically when either the revenue target is reached or the per-level timeout expires.
    - On simulation end, the player is returned to design mode automatically.
    - If the revenue target was reached, the end-of-level screen is shown. If not, the canvas is editable for another attempt.
    - In design mode, nodes and edges can be freely added, moved, and deleted.
    - In simulate mode, node and edge editing is disabled and the palette is non-interactive.
    - The Users node emits requests at the current traffic rate (ops/sec).
    - Requests travel through connected nodes in sequence (e.g. Users → Server → DB).
    - Traffic grows on a scripted schedule defined in level data.
    - Each node processes up to its max capacity; excess requests are dropped.
    - Simulation state is accessible to all UI components.

- [x] CODE: Implement Load Balancer distribution
  - Feature: A Load Balancer node distributes incoming requests evenly across all connected downstream nodes.
  - Files: `src/simulation/engine.*`
  - Acceptance:
    - Requests arriving at a Load Balancer are split equally across its outgoing connections.
    - The Load Balancer itself has no capacity limit and cannot become overloaded.
    - Removing a downstream server rebalances traffic across remaining servers immediately.

- [x] CODE: Implement Cache interception
  - Feature: A Cache node intercepts a percentage of DB-bound requests (cache hit rate, defined per level).
  - Files: `src/simulation/engine.*`
  - Acceptance:
    - Hit-rate percentage is defined in level data and applied at runtime.
    - Cache hits do not travel to the DB.
    - Cache misses continue to the DB as normal.
    - The Cache node itself has a capacity of 200 ops/sec and can become overloaded.

- [x] CODE: Implement revenue tracking
  - Feature: Each successfully handled request earns $0.10; dropped requests earn nothing.
  - Files: `src/simulation/engine.*`, `src/store.*`
  - Acceptance:
    - Revenue accumulates in real time during simulation.
    - Dropped requests do not contribute to revenue.
    - Running cash balance is displayed in the top bar and updates continuously.
    - Revenue resets to the starting budget ($500) at the start of each level.

---

## Phase 5: Overload Visualisation

- [x] CODE: Implement overloaded node state
  - Feature: When a node's incoming ops/sec exceeds its capacity, it enters the overloaded visual state.
  - Files: custom React Flow node components, styles
  - Acceptance:
    - Overloaded nodes render with a coral/red fill and a pulse or glow effect.
    - The transition from normal to overloaded is immediate (no intermediate state).
    - Resolving the overload (reducing incoming traffic) returns the node to the normal state immediately.
    - The Inspector panel reflects the overloaded state in the load percentage field.

---

## Phase 6: Inspector Panel

- [x] CODE: Build Inspector panel
  - Feature: Clicking a node opens the Inspector panel showing per-component operational data.
  - Files: `src/components/Inspector.*`
  - Acceptance:
    - Panel displays: component name, type, current ops/sec, max capacity, current load %, latency contribution (ms), and cost.
    - Panel updates in real time during simulation.
    - Clicking elsewhere or pressing Escape closes the panel.
    - Panel is readable and uncluttered; does not resemble a dense dashboard.

---

## Phase 7: Level System

- [x] CODE: Define level data schema
  - Feature: Create a data structure for hand-authored levels specifying palette, traffic script, and revenue target.
  - Files: `src/levels/types.*`, `src/levels/index.*`
  - Acceptance:
    - Each level record contains: id, available components, traffic growth script, simulation timeout, revenue target, unlock trigger, coach messages, and end-of-level feedback text.
    - Level data is authored in a separate file from game logic.

- [x] CODE: Author 6 levels
  - Feature: Write the hand-authored data for all 6 MVP levels.
  - Files: `src/levels/level1.*` … `src/levels/level6.*`
  - Acceptance:
    - Level 1: Users, Server, DB only; low revenue target; teaches basic placement and connection.
    - Level 2: Introduces overload; Server becomes saturated; teaches capacity limits.
    - Level 3: Unlocks second Server; teaches horizontal scaling.
    - Level 4: Unlocks Load Balancer; teaches automatic traffic distribution.
    - Level 5: DB becomes the bottleneck; unlocks DB upgrade; teaches DB scaling.
    - Level 6: Introduces Cache; teaches read offloading and cache hit rate.
    - Each level's revenue target is achievable with the correct architecture and increasingly challenging with a naive one.

- [x] CODE: Implement unlock trigger system
  - Feature: Components and mechanics unlock based on defined trigger conditions.
  - Files: `src/simulation/unlocks.*`
  - Acceptance:
    - Level 2 content unlocks when any node first reaches 100% capacity.
    - Level 3 content unlocks when a node has been overloaded for 10+ continuous seconds.
    - Level 4 content unlocks when the player has 2 or more servers placed simultaneously.
    - Levels 5 and 6 unlock on completion of the previous level.
    - Newly unlocked components appear in the palette immediately.

- [x] CODE: Implement win condition and level completion
  - Feature: The level completes when earned revenue reaches the target amount.
  - Files: `src/simulation/engine.*`, `src/store.*`
  - Acceptance:
    - Simulation is paused automatically when the revenue target is reached.
    - The end-of-level screen is shown.
    - Progress is saved to `localStorage` before showing the end-of-level screen.

- [x] CODE: Build end-of-level screen
  - Feature: Display score, educational feedback, and Continue/Replay options after each level.
  - Files: `src/components/EndOfLevelScreen.*`
  - Acceptance:
    - Screen shows a score derived from efficiency (e.g. revenue earned vs components purchased).
    - Screen shows 2–3 lines of specific, named feedback describing the concept the player demonstrated.
    - A Continue button loads the next level.
    - A Replay button resets the current level for a better score.
    - Tone is calm, specific, and educational.

- [x] CODE: Implement localStorage save and restore
  - Feature: Auto-save completed level progress to localStorage; restore on page load.
  - Files: `src/store.*`, `src/persistence.*`
  - Acceptance:
    - Completed levels are saved to localStorage after each level is finished.
    - On page reload, the player is returned to the first uncompleted level.
    - Saved state is not corrupted by schema changes during development (versioned or cleared gracefully).

---

## Phase 7.5: Playable Level Runtime

- [x] CODE: Add level-authored starting layouts
  - Feature: Extend level definitions with per-level starting nodes/edges and objective text so each level loads as a distinct playable setup.
  - Files: `src/levels/types.*`, `src/levels/level1.*` … `src/levels/level6.*`
  - Acceptance:
    - Each level can define an initial graph state (starting nodes and edges).
    - Level 1 starts with a clear minimum setup objective shown in level data.
    - Levels with pre-placed infrastructure mark locked nodes when required by the design.

- [x] CODE: Load and reset level sessions correctly
  - Feature: Add a single level-loading path that resets board/session state whenever a level is entered, continued, replayed, or restored.
  - Files: `src/layouts/game-layout.*`, `src/store.*`
  - Acceptance:
    - Entering a level resets graph, selection, overload timers, and end-of-level overlay state.
    - Continue loads the next level's authored starting layout.
    - Replay reloads the current level's authored starting layout.
    - Revenue/simulation state resets consistently at level start.

- [x] CODE: Restore first incomplete level on startup
  - Feature: Derive the active level from persisted progress so players resume at the first uncompleted level.
  - Files: `src/persistence.*`, `src/layouts/game-layout.*`
  - Acceptance:
    - On page load, the game starts on level 1 when no progress exists.
    - With saved progress, the game starts on the first incomplete level.
    - Schema-mismatch or malformed saved data falls back safely to level 1.

- [x] CODE: Surface level context in top-level UI
  - Feature: Display level number/title, current objective, and revenue target in the main gameplay chrome.
  - Files: `src/components/top-bar.*`, `src/layouts/game-layout.*`
  - Acceptance:
    - Players can always see the active level number and title during gameplay.
    - Objective text is visible without opening secondary panels.
    - Revenue target for the active level is visible while playing.

- [x] CODE: Add selectable level progression strip
  - Feature: Provide a compact level selector showing completed, current, unlocked, and locked levels.
  - Files: `src/components/*`, `src/layouts/game-layout.*`
  - Acceptance:
    - Completed levels are replayable from the selector.
    - The next unlocked level is selectable after meeting unlock rules.
    - Locked levels are visible but non-interactive.

- [x] CODE: Block simulation when architecture is not runnable
  - Feature: Prevent Start Traffic until the canvas has a valid path from Users to a terminal service and show a concise hint.
  - Files: `src/layouts/game-layout.*`, `src/simulation/*`
  - Acceptance:
    - Clicking Start Traffic with an invalid architecture does not start simulation.
    - A short, actionable message tells the player what to place/connect.
    - Once architecture is valid, Start Traffic works without extra confirmation.

- [x] CODE: Add runtime level progression tests
  - Feature: Cover level load/continue/replay/restore behavior and non-runnable-architecture gating with automated tests.
  - Files: `src/layouts/game-layout.test.tsx`, `src/persistence.test.ts`, level-related tests
  - Acceptance:
    - Tests assert authored starting layout loads per level.
    - Tests assert Continue and Replay load correct level state.
    - Tests assert startup restore picks the first incomplete level.
    - Tests assert invalid architecture blocks simulation with guidance.

---

## Phase 8: Coach and Onboarding

- [x] CODE: Build Coach panel
  - Feature: Display short, contextual guidance messages in the Coach panel during play.
  - Files: `src/components/Coach.*`
  - Acceptance:
    - Coach panel shows the opening mission message when a level starts.
    - Coach messages update when unlock triggers fire.
    - Coach messages fire when an overload occurs for the first time in a level.
    - Messages are one or two lines; no walls of text.
    - Tone is calm and instructive.

- [x] CODE: Build Event Log
  - Feature: Display a running log of key state changes (node placed, overload started, unlock triggered, etc.).
  - Files: `src/components/EventLog.*`
  - Acceptance:
    - Log entries appear in chronological order.
    - Log shows at minimum: component placed, connection created, overload started, overload resolved, concept unlocked.
    - Log is scrollable if entries overflow.

---

## Phase 9: Responsive Layout

- [x] CODE: Ensure responsive layout across breakpoints
  - Feature: Game is fully playable on desktop and mobile in portrait and landscape.
  - Files: layout components, global styles
  - Acceptance:
    - Palette, canvas, and inspector are accessible on screens as narrow as 375px.
    - In portrait on mobile, panels reflow (e.g. palette collapses to a bottom drawer or compact strip).
    - Drag-and-drop placement works correctly on touch devices.
    - Connection port targets meet the 44×44px minimum touch target size.
    - No horizontal scrollbar appears at any tested viewport size.
