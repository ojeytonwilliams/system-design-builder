# Migrate game-canvas.tsx from @xyflow/react to PixiJS

## Motivation

`@xyflow/react` imposes a flowchart metaphor: every visual must be a node (a React DOM element in a box) or an edge (an SVG line). This blocks richer game visuals — traffic represented as emoji particles flying between servers, glow effects on overloaded nodes, or any free-form animation independent of the node/edge graph structure.

Replacing React Flow with **PixiJS** (`pixi.js` + `@pixi/react`) gives us a WebGL-backed canvas where we can draw anything — nodes, bezier edges, particle bursts, glow filters — while keeping React and the existing state management unchanged.

---

## What stays the same

| Area | Files | Notes |
|---|---|---|
| Simulation engine | `src/simulation/` | Pure TypeScript, zero React, untouched |
| State management | `src/store.tsx` | `SimulationContext` + `useReducer`, unchanged |
| Game orchestration | `src/layouts/game-layout.tsx` | Only the `Edge` type import changes |
| All UI panels | `src/components/coach.tsx`, `inspector.tsx`, `top-bar.tsx`, `event-log.tsx`, `level-strip.tsx`, `palette.tsx`, `palette-item.tsx`, `end-of-level-screen.tsx` | Zero changes |
| `GameCanvas` props API | `src/components/game-canvas.tsx` | The `GameCanvasProps` interface is preserved exactly |
| Exported symbols | `src/components/game-canvas.tsx` | `GameCanvas`, `isConnectionValid`, `snapPositionToGrid`, `ArchitectureCanvasNode`, `ArchitectureNodeData` still exported |

---

## What changes

| Area | Change |
|---|---|
| `src/components/game-canvas.tsx` | Full rewrite. Remove all `@xyflow/react` imports. Replace `<ReactFlow>` with a Pixi `<Application>`. Implement custom node/edge/particle rendering. |
| `src/components/game-canvas.test.tsx` | Full rewrite. Tests that queried React Flow DOM internals (`.react-flow__background`, handle elements) are replaced with behaviour-level tests via callbacks and wrapper `data-testid` attributes. Pure logic tests (`isConnectionValid`, `snapPositionToGrid`) are kept unchanged. |
| `src/layouts/game-layout.tsx` | One line: replace `import type { Edge } from "@xyflow/react"` with the local `PixiEdge` type. |
| `package.json` | Add `pixi.js`, `@pixi/react`. Remove `@xyflow/react` after migration is complete and all tests pass. |

---

## New dependencies

```
pnpm add --save-exact pixi.js @pixi/react
```

Check the latest exact versions with `pnpm info pixi.js version` and `pnpm info @pixi/react version` before pinning.

`@pixi/react` v8 requires PixiJS v8 and was written specifically for React 19. The project uses React 19.2.4, so this is a clean fit.

Optional — add after the core migration works:

```
pnpm add --save-exact pixi-filters
```

`pixi-filters` provides `GlowFilter` for the overloaded node glow effect. The initial implementation can fake the glow with a thicker coloured stroke; upgrade to `GlowFilter` separately.

---

## Type replacements

React Flow's `Edge` and `Node` types are removed. Replace them with local types that carry the same data:

```typescript
// Replaces @xyflow/react's Edge
interface PixiEdge {
  animated?: boolean;
  id: string;
  selected?: boolean;
  source: string;   // source node id
  target: string;   // target node id
}

// Replaces @xyflow/react's Node<ArchitectureNodeData, "architecture">
interface PixiNode {
  data: ArchitectureNodeData;
  id: string;
  position: { x: number; y: number };
  type: "architecture";
}

// Rename throughout: ArchitectureCanvasNode = PixiNode
type ArchitectureCanvasNode = PixiNode;
```

`Connection`, `NodeProps`, `EdgeProps`, `NodeMouseHandler`, `EdgeMouseHandler` from React Flow are not needed — they were only used inside `game-canvas.tsx`.

In `game-layout.tsx`, replace:
```typescript
import type { Edge } from "@xyflow/react";
```
with:
```typescript
import type { ArchitectureCanvasNode } from "../components/game-canvas.js";
// PixiEdge is re-exported from game-canvas.tsx as "Edge" for backwards compatibility:
import type { Edge } from "../components/game-canvas.js";
```

Or simply define `Edge = PixiEdge` and re-export it from `game-canvas.tsx` so `game-layout.tsx` needs no other changes.

---

## Architecture

```
<div data-testid="game-canvas" style={{ position: "relative", height: "100%", width: "100%" }}>

  {/* HTML5 drag-drop zone — wraps the canvas element */}
  <div
    data-testid="game-canvas-dropzone"
    onDragOver={handleDragOver}
    onDrop={handleDrop}
    style={{ height: "100%", width: "100%" }}
  >
    {/* Pixi Application — fills the dropzone via resizeTo */}
    <Application resizeTo={dropzoneRef}>

      {/* Layer 1: background dot grid */}
      <pixiGraphics draw={drawDotGrid} />

      {/* Layer 2: edges */}
      <pixiContainer>
        {edges.map(edge => (
          <PixiEdgeGraphic key={edge.id} edge={edge} nodes={nodes} isSimulating={isSimulating} />
        ))}
        {pendingEdge && <LiveEdgeGraphic pendingEdge={pendingEdge} nodes={nodes} />}
      </pixiContainer>

      {/* Layer 3: nodes */}
      <pixiContainer>
        {nodes.map(node => (
          <PixiNodeGraphic
            key={node.id}
            node={node}
            isLocked={isLocked || lockedNodeIds.includes(node.id)}
            isSelected={node.id === selectedNodeId}
            isOverloaded={overloadedNodeIds.includes(node.id)}
            onSelect={handleNodeSelect}
            onDragEnd={handleNodeDragEnd}
            onHandleClick={handleHandleClick}
            onContextMenu={handleNodeContextMenu}
          />
        ))}
      </pixiContainer>

    </Application>
  </div>

  {/* DOM overlay: context menu */}
  {contextMenu && <ContextMenuElement ... />}

</div>
```

---

## Step-by-step implementation

### Step 1 — Register Pixi extensions

`@pixi/react` v8 uses an `extend()` call to register which Pixi.js classes become React components. Do this once at the top of `game-canvas.tsx` (or in a shared setup file).

```typescript
import { extend } from "@pixi/react";
import {
  Application as PixiApplication,
  Container,
  Graphics,
  Text,
  TextStyle,
} from "pixi.js";

extend({ Container, Graphics, Text });
```

After this, `<pixiContainer>`, `<pixiGraphics>`, and `<pixiText>` are valid JSX elements. The `Application` component from `@pixi/react` wraps `PixiApplication` automatically.

---

### Step 2 — Background dot grid

The current background uses a CSS `radial-gradient`. In Pixi, replicate it with a `<pixiGraphics>` that draws dots at each grid intersection.

```typescript
const drawDotGrid = useCallback(
  (g: Graphics) => {
    g.clear();
    const DOT_RADIUS = 0.8;
    const DOT_COLOR = 0x1a2744;
    const DOT_ALPHA = 0.18;

    for (let x = BACKGROUND_GAP; x < stageWidth; x += BACKGROUND_GAP) {
      for (let y = BACKGROUND_GAP; y < stageHeight; y += BACKGROUND_GAP) {
        g.circle(x, y, DOT_RADIUS);
        g.fill({ alpha: DOT_ALPHA, color: DOT_COLOR });
      }
    }
  },
  [stageWidth, stageHeight],
);
```

`stageWidth` and `stageHeight` come from a `ResizeObserver` on the dropzone ref, or from `useApplication()`.

---

### Step 3 — Node rendering (`PixiNodeGraphic`)

Each node is a `pixiContainer` positioned at `node.position.x, node.position.y`. Inside:
- A `pixiGraphics` for the rounded-rect background and border
- A `pixiText` for the emoji icon (centred in its pill)
- A `pixiText` for the label below

```typescript
const PixiNodeGraphic = ({ node, isSelected, isOverloaded, onSelect, onDragEnd, onHandleClick, onContextMenu, isLocked }: PixiNodeProps) => {
  const { accentColor } = CANVAS_COMPONENT_LIBRARY[node.data.componentType];

  // Compute fill and border colours from state (same logic as ArchitectureNode)
  let fillColor = 0xfffdf8;
  let borderColor = 0x1a2744;
  let borderWidth = 2;

  if (isSelected) {
    fillColor = 0xfff3ea;
    borderColor = 0xe5634d;
  }
  if (isOverloaded) {
    fillColor = 0xffe4dd;
    borderColor = 0xe5634d;
    borderWidth = 3;
  }

  const drawBackground = useCallback((g: Graphics) => {
    g.clear();
    g.roundRect(0, 0, NODE_WIDTH, NODE_MIN_HEIGHT, 16);
    g.fill({ color: fillColor });
    g.stroke({ color: borderColor, width: borderWidth });
  }, [fillColor, borderColor, borderWidth]);

  const isUsersNode = node.data.componentType === "users";

  return (
    <pixiContainer
      x={node.position.x}
      y={node.position.y}
      eventMode="static"
      cursor={isLocked ? "default" : "grab"}
      onPointerDown={isLocked ? undefined : handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerUpOutside={handlePointerUp}
      onRightClick={isLocked ? undefined : (e) => onContextMenu(e, node)}
      onClick={(e) => { onSelect(node.id); e.stopPropagation(); }}
      data-node-id={node.id}
    >
      {/* Background rect */}
      <pixiGraphics draw={drawBackground} data-testid={`canvas-node-${node.id}`} />

      {/* Icon pill */}
      <pixiGraphics draw={drawIconPill(accentColor)} x={NODE_WIDTH / 2 - 20} y={12} />
      <pixiText
        text={node.data.icon ?? ""}
        x={NODE_WIDTH / 2}
        y={28}
        anchor={{ x: 0.5, y: 0.5 }}
        style={new TextStyle({ fontSize: 20 })}
      />

      {/* Label */}
      <pixiText
        text={node.data.label}
        x={NODE_WIDTH / 2}
        y={68}
        anchor={{ x: 0.5, y: 0 }}
        style={new TextStyle({ fontSize: 13, fontWeight: "700", fill: 0x1a2744 })}
      />

      {/* Source handles */}
      <HandleGraphic
        data-testid={`handle-${node.id}-source-right`}
        x={NODE_WIDTH}
        y={NODE_MIN_HEIGHT / 2}
        onClick={(e) => { e.stopPropagation(); onHandleClick(node.id, "right", "source"); }}
      />
      <HandleGraphic
        data-testid={`handle-${node.id}-source-bottom`}
        x={NODE_WIDTH / 2}
        y={NODE_MIN_HEIGHT}
        onClick={(e) => { e.stopPropagation(); onHandleClick(node.id, "bottom", "source"); }}
      />

      {/* Target handles (not on users node) */}
      {!isUsersNode && (
        <>
          <HandleGraphic
            data-testid={`handle-${node.id}-target-left`}
            x={0}
            y={NODE_MIN_HEIGHT / 2}
            onClick={(e) => { e.stopPropagation(); onHandleClick(node.id, "left", "target"); }}
          />
          <HandleGraphic
            data-testid={`handle-${node.id}-target-top`}
            x={NODE_WIDTH / 2}
            y={0}
            onClick={(e) => { e.stopPropagation(); onHandleClick(node.id, "top", "target"); }}
          />
        </>
      )}
    </pixiContainer>
  );
};
```

**`HandleGraphic`** is a small invisible circle with a visible dot centre:

```typescript
const HANDLE_RADIUS = PORT_HIT_SIZE / 2;  // 22px hit area
const HANDLE_DOT_RADIUS = 4;

const HandleGraphic = ({ x, y, onClick, "data-testid": testId }: HandleProps) => {
  const draw = useCallback((g: Graphics) => {
    g.clear();
    // Invisible hit area
    g.circle(0, 0, HANDLE_RADIUS);
    g.fill({ alpha: 0, color: 0x000000 });
    // Visible dot
    g.circle(0, 0, HANDLE_DOT_RADIUS);
    g.fill({ color: 0x7b8cb2 });
  }, []);

  return (
    <pixiGraphics
      draw={draw}
      x={x}
      y={y}
      eventMode="static"
      cursor="crosshair"
      onClick={onClick}
    />
  );
};
```

**Node drag** uses pointer events on the container, with the global pointer position tracked via the Pixi stage:

```typescript
const handlePointerDown = (e: FederatedPointerEvent) => {
  if (isLocked) return;
  setDragging(true);
  dragOffset.current = { x: e.globalX - node.position.x, y: e.globalY - node.position.y };
};

// In the parent GameCanvas, attach a globalpointermove listener when any node is dragging
// and a pointerup listener to finalise, calling onDragEnd with the snapped position
```

---

### Step 4 — Edge rendering (`PixiEdgeGraphic`)

Given an edge `{ source, target }`, look up both nodes, compute the handle positions, then draw a bezier curve.

**Handle centre positions** (replaces `getHandleCenterAnchorPoint`):

```typescript
type HandleSide = "right" | "bottom" | "left" | "top";

const getHandlePosition = (node: PixiNode, side: HandleSide): Point => {
  const { x, y } = node.position;
  switch (side) {
    case "right":  return { x: x + NODE_WIDTH,      y: y + NODE_MIN_HEIGHT / 2 };
    case "bottom": return { x: x + NODE_WIDTH / 2,  y: y + NODE_MIN_HEIGHT };
    case "left":   return { x: x,                   y: y + NODE_MIN_HEIGHT / 2 };
    case "top":    return { x: x + NODE_WIDTH / 2,  y: y };
  }
};
```

Edges always go **source-right → target-left** by default (the most common connection). The auto-routing picks the closest pair of source/target handles:

```typescript
const chooseBestHandles = (
  source: PixiNode,
  target: PixiNode,
): { sourceHandle: HandleSide; targetHandle: HandleSide } => {
  // Simplified: if target is to the right of source, use right→left
  // Otherwise use bottom→top or the closest pair
  const dx = target.position.x - source.position.x;
  const dy = target.position.y - source.position.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: "right",  targetHandle: "left" }
      : { sourceHandle: "left",   targetHandle: "right" };
  }
  return dy >= 0
    ? { sourceHandle: "bottom", targetHandle: "top" }
    : { sourceHandle: "top",    targetHandle: "bottom" };
};
```

**Bezier control points** (replaces `getBezierPath`):

```typescript
const getBezierControlPoints = (src: Point, tgt: Point) => {
  const dx = Math.abs(tgt.x - src.x);
  const dy = Math.abs(tgt.y - src.y);
  const curvature = Math.min(Math.max(dx, dy) * 0.5, 120);

  // horizontal bias if dx > dy, vertical otherwise
  if (dx >= dy) {
    return { cp1: { x: src.x + curvature, y: src.y }, cp2: { x: tgt.x - curvature, y: tgt.y } };
  }
  return { cp1: { x: src.x, y: src.y + curvature }, cp2: { x: tgt.x, y: tgt.y - curvature } };
};
```

**Drawing the edge:**

```typescript
const PixiEdgeGraphic = ({ edge, nodes, isSimulating }: PixiEdgeProps) => {
  const dashOffsetRef = useRef(0);

  const sourceNode = nodes.find(n => n.id === edge.source);
  const targetNode = nodes.find(n => n.id === edge.target);

  if (!sourceNode || !targetNode) return null;

  const { sourceHandle, targetHandle } = chooseBestHandles(sourceNode, targetNode);
  const src = getHandlePosition(sourceNode, sourceHandle);
  const tgt = getHandlePosition(targetNode, targetHandle);
  const { cp1, cp2 } = getBezierControlPoints(src, tgt);

  const isSelected = edge.selected === true;
  const strokeColor = isSelected ? 0xe5634d : 0x7b8cb2;
  const strokeWidth = isSelected ? 3 : 2;

  // Animate dash offset via Ticker when simulating
  useTick((delta) => {
    if (!isSimulating) return;
    dashOffsetRef.current = (dashOffsetRef.current - delta.deltaTime * 0.8) % 12;
    // Force redraw by updating a reactive value, or use imperative Graphics ref
  });

  const draw = useCallback((g: Graphics) => {
    g.clear();
    g.moveTo(src.x, src.y);
    g.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, tgt.x, tgt.y);

    if (isSimulating) {
      g.stroke({
        color: strokeColor,
        width: strokeWidth,
        alpha: 0.9,
        cap: "round",
        // PixiJS v8 dash: use setStrokeDash if available, or draw segmented lines
      });
    } else {
      g.stroke({ color: strokeColor, width: strokeWidth, alpha: 0.9 });
    }

    // Arrow head (manual triangle at target end)
    drawArrowHead(g, cp2, tgt, strokeColor);
  }, [src, tgt, cp1, cp2, strokeColor, strokeWidth, isSimulating]);

  return (
    <pixiGraphics
      data-testid={`canvas-edge-${edge.id}`}
      draw={draw}
      eventMode="static"
      cursor="pointer"
      onClick={(e) => { onEdgeClick(edge.id); e.stopPropagation(); }}
      onRightClick={(e) => { onEdgeContextMenu(e, edge.id); }}
    />
  );
};
```

> **Note on animated dashes in PixiJS v8:** PixiJS v8's `Graphics` API supports dash patterns via `setStrokeDash([dashLength, gapLength])` before the stroke call. Animating requires clearing and redrawing the Graphics object each tick. Use a `ref` to the Graphics instance (via `onMount` or similar) and drive redraws from `useTick`.

---

### Step 5 — Drop zone and palette placement

The HTML5 drag-drop behaviour is **unchanged** from the current implementation. The drop target is a `<div>` wrapping the `<Application>`. The `onDrop` handler reads `event.dataTransfer`, computes position relative to the div's `getBoundingClientRect()`, and calls `snapPositionToGrid()`.

```typescript
// unchanged from current game-canvas.tsx:
const handleDrop = (event: DragEvent<HTMLDivElement>) => {
  event.preventDefault();
  if (isLocked) return;

  const componentType = event.dataTransfer.getData("application/component-type");
  if (!isComponentType(componentType)) return;

  const bounds = event.currentTarget.getBoundingClientRect();
  const position = snapPositionToGrid({ x: event.clientX - bounds.left, y: event.clientY - bounds.top });

  setNodes((currentNodes) => {
    const nodeId = getNextNodeId(componentType, currentNodes);
    return [...currentNodes, { data: createNodeData(componentType), id: nodeId, position, type: "architecture" }];
  });
  setSelectedNodeId(null);
  setContextMenu(null);
};
```

---

### Step 6 — Node dragging with grid snap

Pixi drag follows a three-event pattern. Maintain a `draggingRef` with the active node id and the pointer offset.

```typescript
interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

const draggingRef = useRef<DragState | null>(null);

// Attached to each PixiNodeGraphic's onPointerDown:
const onNodePointerDown = (nodeId: string, e: FederatedPointerEvent) => {
  const node = nodes.find(n => n.id === nodeId);
  if (!node || isLocked) return;

  draggingRef.current = {
    nodeId,
    offsetX: e.globalX - node.position.x,
    offsetY: e.globalY - node.position.y,
  };
  e.stopPropagation();
};

// Attached to the root pixiContainer (stage) with eventMode="static":
const onStagePointerMove = (e: FederatedPointerEvent) => {
  const drag = draggingRef.current;
  if (!drag) return;

  const newX = e.globalX - drag.offsetX;
  const newY = e.globalY - drag.offsetY;

  // Update node position in state (or use a ref + direct container.x/y for performance)
  setNodes(prev => prev.map(n =>
    n.id === drag.nodeId ? { ...n, position: { x: newX, y: newY } } : n
  ));
};

// Attached to the root pixiContainer (stage) with eventMode="static":
const onStagePointerUp = () => {
  const drag = draggingRef.current;
  if (!drag) return;

  // Snap to grid on release
  setNodes(prev => prev.map(n =>
    n.id === drag.nodeId ? { ...n, position: snapPositionToGrid(n.position) } : n
  ));
  draggingRef.current = null;
};
```

> **Performance note:** Updating React state on every `pointermove` event causes re-renders on every frame during dragging. For smooth dragging, keep the position in a mutable ref and update the Pixi container's `x`/`y` directly, committing to React state only on `pointerup`. Access the Pixi container via an `onMount` ref callback: `onMount={(c) => { containerRef.current = c; }}`.

---

### Step 7 — Connection interaction

React Flow handled connection drawing automatically via the `onConnect` prop. In Pixi, implement a **two-phase click model**:

1. **Phase 1:** Player clicks a source handle → `pendingEdge` state is set to `{ sourceNodeId, sourceHandle }`.
2. The canvas draws a live bezier from the source handle centre to the current mouse position.
3. **Phase 2:** Player clicks a target handle → validate, call `addEdge`, clear `pendingEdge`.
4. Player clicks anywhere else (pane, node body, Escape) → cancel and clear `pendingEdge`.

```typescript
interface PendingEdge {
  sourceHandle: HandleSide;
  sourceNodeId: string;
  x: number;   // current mouse position for live preview
  y: number;
}

const [pendingEdge, setPendingEdge] = useState<PendingEdge | null>(null);

const handleHandleClick = (nodeId: string, side: HandleSide, kind: "source" | "target") => {
  if (kind === "source") {
    // Start connection
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    const pos = getHandlePosition(node, side);
    setPendingEdge({ sourceHandle: side, sourceNodeId: nodeId, x: pos.x, y: pos.y });
    return;
  }

  // kind === "target" — complete the connection
  if (pendingEdge === null) return;

  const sourceNode = nodes.find(n => n.id === pendingEdge.sourceNodeId);
  const targetNode = nodes.find(n => n.id === nodeId);
  if (!sourceNode || !targetNode) return;

  if (!isConnectionValid(sourceNode.data.componentType, targetNode.data.componentType)) {
    setPendingEdge(null);
    return;
  }

  const edgeId = `edge-${pendingEdge.sourceNodeId}-${nodeId}-${Date.now()}`;
  setEdges(prev => [...prev, { animated: false, id: edgeId, source: pendingEdge.sourceNodeId, target: nodeId }]);
  setPendingEdge(null);
};

// Update live preview position on pointer move over the stage
const onStagePointerMove = (e: FederatedPointerEvent) => {
  if (pendingEdge !== null) {
    setPendingEdge(prev => prev ? { ...prev, x: e.globalX, y: e.globalY } : null);
  }
  // ... also handle drag
};
```

**`LiveEdgeGraphic`** draws a dashed line from the source handle to the current mouse position, giving visual feedback during connection:

```typescript
const LiveEdgeGraphic = ({ pendingEdge, nodes }: LiveEdgeProps) => {
  const sourceNode = nodes.find(n => n.id === pendingEdge.sourceNodeId);
  if (!sourceNode) return null;

  const src = getHandlePosition(sourceNode, pendingEdge.sourceHandle);
  const tgt = { x: pendingEdge.x, y: pendingEdge.y };
  const { cp1, cp2 } = getBezierControlPoints(src, tgt);

  const draw = useCallback((g: Graphics) => {
    g.clear();
    g.moveTo(src.x, src.y);
    g.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, tgt.x, tgt.y);
    g.stroke({ alpha: 0.5, color: 0x7b8cb2, dash: [6, 6], width: 2 });
  }, [src, tgt, cp1, cp2]);

  return <pixiGraphics draw={draw} />;
};
```

---

### Step 8 — Context menu and keyboard shortcuts

The context menu is a **React DOM element** (an absolutely positioned `<div>`) rendered on top of the canvas. This is unchanged from the current implementation. The `contextMenu` state holds `{ kind, x, y, nodeId/edgeId }` and the element renders a "Remove" button.

Right-click events come from Pixi:
- `onRightClick` on a `pixiContainer` (node) → `handleNodeContextMenu`
- `onRightClick` on a `pixiGraphics` (edge) → `handleEdgeContextMenu`

The `clientX`/`clientY` position for the context menu: use `e.client.x` / `e.client.y` from the `FederatedPointerEvent`, or convert `e.globalX`/`e.globalY` (Pixi canvas coords) to screen coords by adding the canvas element's `getBoundingClientRect().left/top`.

Keyboard shortcuts are handled exactly as now — `window.addEventListener("keydown", handleKeyDown)` in a `useEffect`. The Escape and Delete logic is unchanged.

---

### Step 9 — Overloaded node glow

When `isOverloaded`, draw an extra rounded rect behind the node at `borderWidth + 6` stroke width with `alpha: 0.5` and `color: 0xe5634d`. This replicates the `overload-pulse` CSS box-shadow from the current implementation.

```typescript
const drawBackground = useCallback((g: Graphics) => {
  g.clear();
  if (isOverloaded) {
    // Glow ring behind the node
    g.roundRect(-3, -3, NODE_WIDTH + 6, NODE_MIN_HEIGHT + 6, 18);
    g.stroke({ alpha: 0.5, color: 0xe5634d, width: borderWidth + 6 });
  }
  g.roundRect(0, 0, NODE_WIDTH, NODE_MIN_HEIGHT, 16);
  g.fill({ color: fillColor });
  g.stroke({ color: borderColor, width: borderWidth });
}, [fillColor, borderColor, borderWidth, isOverloaded]);
```

> The `pixi-filters` `GlowFilter` upgrade and traffic particle system are deferred to `design/post-pixi-migration.md`.

---

## Test rewrite strategy

### Keep unchanged

- All `isConnectionValid` tests
- All `snapPositionToGrid` tests
- `game-layout.test.tsx` tests that do not depend on React Flow internals

### Remove (React Flow-specific)

- "renders a React Flow dotted background" — queries `.react-flow__background` which will not exist
- Handle style tests (width/height/position of DOM handle elements) — handles are now Pixi objects

### Rewrite with new strategy

React Flow let tests introspect DOM internals (`data-testid` on its internal divs). After the migration, tests assert behaviour via the public API:

| Old test | New approach |
|---|---|
| `canvas-node-{id}` exists in DOM | `onStateChange` called with node in the nodes array |
| Node has `data-overloaded="true"` | `onStateChange` called; check the `data` property of the node |
| Edge element exists in DOM | `onStateChange` called with edge in the edges array |
| Drop → node appears | `onStateChange` receives updated `nodes` |
| Delete key → node removed | `onStateChange` receives `nodes` without the deleted node |
| Context menu Remove → node gone | `onStateChange` receives updated `nodes` |

```typescript
// Example rewritten test
it("drops a palette item and reports it via onStateChange", () => {
  const onStateChange = vi.fn();
  render(<GameCanvas onStateChange={onStateChange} />);
  const dropzone = screen.getByTestId("game-canvas-dropzone");

  vi.spyOn(dropzone, "getBoundingClientRect").mockReturnValue({ ... });

  fireEvent.drop(dropzone, {
    clientX: 145, clientY: 117,
    dataTransfer: { getData: () => "server" },
  });

  expect(onStateChange).toHaveBeenCalledWith(
    expect.arrayContaining([expect.objectContaining({ id: "server-1" })]),
    expect.any(Array),
  );
});
```

The `data-testid="game-canvas"` and `data-testid="game-canvas-dropzone"` attributes on the wrapper divs remain in place.

> **PixiJS in jsdom:** PixiJS v8's WebGL renderer will fall back to a stub in the jsdom test environment. `@pixi/react`'s `Application` may need a `forceCanvas: true` option or a simple mock for tests. Consider wrapping `<Application>` in a test helper that passes `options={{ preference: "webgl", forceCanvas: true }}` or mocking `@pixi/react` entirely in tests where the canvas content itself is not under test.

---

## Dependency changes

**Add:**
```json
"pixi.js": "x.y.z",
"@pixi/react": "x.y.z"
```

**Remove after migration completes and all tests pass:**
```json
"@xyflow/react": "^12.10.2"
```

Also remove the CSS import from `game-canvas.tsx`:
```typescript
// Delete this line:
import "@xyflow/react/dist/style.css";
```

---

## Verification checklist

Run after each implementation step:

```sh
pnpm test        # simulation engine + preserved pure logic tests must stay green
pnpm lint        # no new lint errors (import/no-default-export, group-exports, etc.)
pnpm fmt:check
```

Manual smoke test after full migration:

- [ ] Canvas renders with a dot grid background
- [ ] Drag a component from the palette → snaps to 48px grid
- [ ] Click a node → Inspector panel updates
- [ ] Click a source handle → live bezier preview follows mouse
- [ ] Click a target handle → edge is drawn
- [ ] Users node has no target handles
- [ ] Cannot connect anything to a Users node
- [ ] Right-click a node → "Remove" context menu appears
- [ ] Delete key removes selected node and its edges
- [ ] Escape clears selection
- [ ] Click "Start Traffic" → edges animate with moving dashes
- [ ] Overload a server → node shows red glow ring
- [ ] Resolve overload → glow disappears
- [ ] Win condition triggers end-of-level screen
- [ ] Level reload resets the canvas cleanly
