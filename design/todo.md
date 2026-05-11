# TODO

## Phase 1: Scaffold — Pixi application with background

- [x] TASK: Install exact-pinned dependencies: `pnpm add --save-exact pixi.js @pixi/react`
- [x] TASK: Define `PixiEdge` and `PixiNode` types in `src/components/game-canvas.tsx`; re-export `PixiEdge` as `Edge` for backwards compatibility; update `src/layouts/game-layout.tsx` to import `Edge` from `../components/game-canvas.js` instead of `@xyflow/react`
- [x] CODE: Pixi Application scaffold
  - Feature: Replace the `<ReactFlow>` wrapper with a `@pixi/react` `<Application>` that fills its container via a `ResizeObserver` on the dropzone `<div>`, and call `extend({ Container, Graphics, Text })` to register Pixi component types
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - `<Application>` renders a `<canvas>` element inside `data-testid="game-canvas-dropzone"`
    - Canvas resizes when the browser window is resized
    - `pnpm test` and `pnpm lint` pass
- [x] CODE: Dot grid background
  - Feature: Render a dot grid matching the current design (`BACKGROUND_GAP = 24px`, dot radius `0.8px`, colour `#1a2744` at 18% opacity) using a `<pixiGraphics>` draw callback that loops over grid intersections; redraw when stage dimensions change
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - A regular grid of dots is visible on the canvas background
    - Grid redraws correctly after a window resize

## Phase 2: Static graph — Nodes and edges rendered without interaction

- [ ] CODE: Graph geometry utilities
  - Feature: Implement pure functions `getHandlePosition(node, side)`, `chooseBestHandles(source, target)`, and `getBezierControlPoints(src, tgt)` as described in `design/replace-react-flow-with-pixi.md`; these replace `getHandleCenterAnchorPoint` and `getBezierPath` from React Flow
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - `chooseBestHandles` returns `right→left` when target is to the right, `bottom→top` when target is below
    - `getBezierControlPoints` produces control points that result in a smooth curve between any two handle positions
- [ ] CODE: `PixiNodeGraphic` component
  - Feature: Render each node as a `<pixiContainer>` positioned at `node.position.x / y`, containing: a `<pixiGraphics>` rounded rect (16px radius, 88×96px) filled and stroked with colours derived from `isSelected` and `isOverloaded` props; a `<pixiGraphics>` icon pill; a `<pixiText>` emoji icon centred in the pill; a `<pixiText>` label below; users node has no target handles
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - Each node from `initialNodes` renders at the correct grid position
    - Selected node uses `#fff3ea` fill and `#e5634d` border
    - Overloaded node uses `#ffe4dd` fill, `#e5634d` border, and a thicker stroke to simulate a glow
    - Users node renders without left/top target handles
- [ ] CODE: `HandleGraphic` component
  - Feature: Render each connection handle as a `<pixiGraphics>` with an invisible 22px-radius hit circle and a visible 4px-radius dot in `#7b8cb2`; source handles at right and bottom of node, target handles at left and top (omitted on users nodes)
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - Each handle's visible dot is centred on the node's edge
    - Hit area covers at least 44×44px (radius 22px)
- [ ] CODE: `PixiEdgeGraphic` component
  - Feature: For each edge in `edges`, look up source and target nodes, call `chooseBestHandles`, compute bezier control points via `getBezierControlPoints`, and draw the curve with `g.bezierCurveTo()`; draw a manual arrowhead triangle at the target end; selected edges use `#e5634d` stroke at width 3, others use `#7b8cb2` at width 2
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - Each edge in `initialEdges` is drawn as a bezier curve connecting its source and target nodes
    - Selected edge renders in coral (`#e5634d`)
    - Arrowhead points at the target handle

## Phase 3: Interaction — Drag, drop, connect, delete

- [ ] CODE: HTML5 drop zone and `componentToPlace` placement
  - Feature: Preserve the existing `onDragOver`/`onDrop` handler on the dropzone `<div>` exactly as in the current implementation; also preserve the `useEffect` that watches `componentToPlace` and adds a node at `DEFAULT_DROP_POSITION` when set; call `onComponentPlaced()` after placement
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - Dragging a palette item onto the canvas and dropping it adds a new node snapped to the 48px grid
    - Dropping while `isLocked` is true does not add a node
    - Passing `componentToPlace="server"` via prop places a node and fires `onComponentPlaced`
- [ ] CODE: Node dragging with grid snap
  - Feature: On `pointerdown` on a non-locked node container, record a `draggingRef` with node id and pointer offset; on stage-level `globalpointermove` update the node's Pixi container position directly via a ref for smooth dragging; on `pointerup` commit the final position to React state via `snapPositionToGrid`; nodes in `lockedNodeIds` are not draggable
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - Dragging a node moves it smoothly and snaps to 48px grid on release
    - Locked nodes (`lockedNodeIds`) cannot be dragged
    - `onStateChange` is called with the updated node position after snap
- [ ] CODE: Two-phase connection with live edge preview
  - Feature: On click of a source handle set `pendingEdge` state with `{ sourceNodeId, sourceHandle, x, y }`; update `x/y` on stage pointer move; render a `LiveEdgeGraphic` (dashed bezier from source handle to mouse position); on click of a target handle validate with `isConnectionValid`, append the new edge to state, and clear `pendingEdge`; clicking the pane or pressing Escape cancels
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - Clicking a source handle shows a dashed bezier preview following the mouse
    - Clicking a valid target handle creates an edge and clears the preview
    - Attempting to connect to a users node cancels with no edge created
    - Clicking the canvas background cancels the pending connection
- [ ] CODE: Node and edge selection
  - Feature: Clicking a node sets `selectedNodeId` state and calls `onSelectedNodeChange`; clicking an edge marks it as `selected: true` in edge state and deselects nodes; clicking the canvas background clears both; Escape also clears
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - Clicking a node selects it (orange fill) and deselects any previously selected node
    - Clicking an edge selects it (orange stroke) and deselects the node
    - Clicking the background clears all selection
- [ ] CODE: Context menu DOM overlay
  - Feature: On right-click of a node (not in `lockedNodeIds`) set `contextMenu` state with `{ kind: "node", nodeId, x, y }` (screen coords); on right-click of an edge set `{ kind: "edge", edgeId, x, y }`; render an absolutely positioned `<div>` with a "Remove" button; clicking Remove calls `removeNodeAndConnections` or filters out the edge, then clears context menu
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - Right-clicking a node shows a "Remove" button at the mouse position
    - Clicking Remove deletes the node and all its connected edges
    - Right-clicking a locked node does not show the context menu
    - Right-clicking an edge shows a "Remove" button that deletes only that edge
- [ ] CODE: Keyboard shortcuts
  - Feature: `window.addEventListener("keydown", handleKeyDown)` in a `useEffect`; Delete key removes the selected node (if not locked) and its edges, or removes the selected edge; Escape clears selection and cancels any pending connection; clean up listener on unmount
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - Selecting a node then pressing Delete removes it and its edges; `onStateChange` is called
    - Pressing Delete with a selected edge removes only that edge
    - Pressing Delete on a locked node does nothing
    - Pressing Escape closes the context menu and clears selection

## Phase 4: Simulation visuals — Animated edges and overload glow

- [ ] CODE: Animated dashed edges during simulation
  - Feature: When `isSimulating` is true, use `useTick` to advance a `dashOffsetRef` each frame and redraw each edge's `<pixiGraphics>` with a moving dash pattern (`dash: [6, 6]`, offset advancing at ~0.8 units per delta); when `isSimulating` becomes false, redraw edges as solid lines
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - Edge lines animate with moving dashes when simulation starts
    - Edges return to solid lines when simulation stops
- [ ] CODE: Overloaded node glow effect
  - Feature: When a node's id appears in `overloadedNodeIds`, draw an extra `<pixiGraphics>` rounded rect behind the node with a stroke 6px wider than the border at `alpha: 0.5` and colour `#e5634d`, replicating the current CSS `overload-pulse` box-shadow; remove the extra stroke when the node is no longer overloaded
  - Files: `src/components/game-canvas.tsx`
  - Acceptance:
    - An overloaded node shows a red glow ring around its border
    - The glow disappears when the node is removed from `overloadedNodeIds`

## Phase 5: Cleanup — Tests and dependency removal

- [ ] CODE: Rewrite `game-canvas.test.tsx`
  - Feature: Replace all React Flow-specific assertions (`.react-flow__background`, DOM handle element pixel dimensions, `data-overloaded` on DOM nodes) with behaviour-level assertions via `onStateChange`, `onSelectedNodeChange`, and `onComponentPlaced` callbacks; keep all `isConnectionValid` and `snapPositionToGrid` tests unchanged; mock or stub `@pixi/react` `Application` for jsdom compatibility
  - Files: `src/components/game-canvas.test.tsx`
  - Acceptance:
    - `pnpm test` passes with no skipped tests
    - Drop, delete, context menu remove, Escape, locked node, and overload tests all pass via callback assertions
    - `isConnectionValid` and `snapPositionToGrid` pure-logic tests are unchanged and still pass
- [ ] TASK: Remove `@xyflow/react` from `package.json` and delete the CSS import `import "@xyflow/react/dist/style.css"` from `game-canvas.tsx`; verify `pnpm install` succeeds and the package is gone
- [ ] TASK: Run the full verification checklist from `design/replace-react-flow-with-pixi.md` manually: dot grid renders, drag+snap, connection flow, users node has no target handles, context menu removes nodes and edges, Delete/Escape shortcuts, simulation shows animated dashed edges, overloaded node glow, win condition, level reload

## Traceability Matrix

| Requirement ID | TODO Item | Status |
|---|---|---|
| REQ-1 (register Pixi extensions) | Phase 1 / CODE: Pixi Application scaffold | mapped |
| REQ-2 (Pixi Application replaces ReactFlow) | Phase 1 / CODE: Pixi Application scaffold | mapped |
| REQ-3 (dot grid background) | Phase 1 / CODE: Dot grid background | mapped |
| REQ-4 (PixiEdge / PixiNode local types) | Phase 1 / TASK: Define PixiEdge and PixiNode types | mapped |
| REQ-5 (game-layout.tsx type import update) | Phase 1 / TASK: Define PixiEdge and PixiNode types | mapped |
| REQ-6 (GameCanvasProps preserved) | Phase 1 / CODE: Pixi Application scaffold | mapped |
| REQ-7 (exported symbols preserved) | Phase 1 / CODE: Pixi Application scaffold | mapped |
| REQ-8 (PixiNodeGraphic visual states) | Phase 2 / CODE: PixiNodeGraphic component | mapped |
| REQ-9 (HandleGraphic hit area + dot) | Phase 2 / CODE: HandleGraphic component | mapped |
| REQ-10 (users node has no target handles) | Phase 2 / CODE: HandleGraphic component | mapped |
| REQ-11 (graph geometry utilities) | Phase 2 / CODE: Graph geometry utilities | mapped |
| REQ-12 (PixiEdgeGraphic bezier + arrow) | Phase 2 / CODE: PixiEdgeGraphic component | mapped |
| REQ-13 (HTML5 drop zone) | Phase 3 / CODE: HTML5 drop zone and componentToPlace | mapped |
| REQ-14 (componentToPlace queued placement) | Phase 3 / CODE: HTML5 drop zone and componentToPlace | mapped |
| REQ-15 (node drag + grid snap) | Phase 3 / CODE: Node dragging with grid snap | mapped |
| REQ-16 (lockedNodeIds / isLocked) | Phase 3 / CODE: Node dragging with grid snap | mapped |
| REQ-17 (two-phase connection) | Phase 3 / CODE: Two-phase connection with live edge preview | mapped |
| REQ-18 (connection validation) | Phase 3 / CODE: Two-phase connection with live edge preview | mapped |
| REQ-19 (LiveEdgeGraphic preview) | Phase 3 / CODE: Two-phase connection with live edge preview | mapped |
| REQ-20 (node and edge selection) | Phase 3 / CODE: Node and edge selection | mapped |
| REQ-21 (context menu DOM overlay) | Phase 3 / CODE: Context menu DOM overlay | mapped |
| REQ-22 (keyboard shortcuts Delete/Escape) | Phase 3 / CODE: Keyboard shortcuts | mapped |
| REQ-23 (animated dashed edges) | Phase 4 / CODE: Animated dashed edges during simulation | mapped |
| REQ-24 (overloaded node glow) | Phase 4 / CODE: Overloaded node glow effect | mapped |
| REQ-25 (traffic particle system) | deferred to design/post-pixi-migration.md | deferred |
| REQ-26 (overload burst particles) | deferred to design/post-pixi-migration.md | deferred |
| REQ-27 (test rewrite) | Phase 5 / CODE: Rewrite game-canvas.test.tsx | mapped |
| REQ-28 (jsdom compatibility) | Phase 5 / CODE: Rewrite game-canvas.test.tsx | mapped |
| NFR-1 (exact-pinned dependencies) | Phase 1 / TASK: Install exact-pinned dependencies | mapped |
| NFR-2 (remove @xyflow/react) | Phase 5 / TASK: Remove @xyflow/react | mapped |
| NFR-3 (pnpm test passes) | Phase 5 / TASK: Run full verification checklist | mapped |
| NFR-4 (pnpm lint passes) | Phase 5 / TASK: Run full verification checklist | mapped |
| NFR-5 (smooth drag via ref) | Phase 3 / CODE: Node dragging with grid snap | mapped |
