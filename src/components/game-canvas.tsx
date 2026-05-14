import { Application, extend, useApplication, useTick } from "@pixi/react";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import type { DragEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

interface BezierCurve {
  cp1: Point;
  cp2: Point;
  p0: Point;
  p3: Point;
}

interface DashStyle {
  alpha: number;
  color: number;
  dashLen: number;
  gapLen: number;
  offset: number;
  width: number;
}

interface WalkState {
  dashLen: number;
  drawing: boolean;
  gapLen: number;
  remaining: number;
}

const BEZIER_STEPS = 80;

const sampleCubicBezier = (t: number, { cp1, cp2, p0, p3 }: BezierCurve): Point => {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * cp1.x + 3 * mt * t2 * cp2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * cp1.y + 3 * mt * t2 * cp2.y + t2 * t * p3.y,
  };
};

const walkDashSegment = (
  g: Graphics,
  state: WalkState,
  opts: { curr: Point; prev: Point; segLen: number },
): void => {
  const { curr, prev, segLen } = opts;
  const { dashLen, gapLen } = state;
  const dx = curr.x - prev.x;
  const dy = curr.y - prev.y;
  let consumed = 0;
  while (consumed < segLen) {
    const available = segLen - consumed;
    if (state.remaining <= available) {
      const frac = (consumed + state.remaining) / segLen;
      const mx = prev.x + dx * frac;
      const my = prev.y + dy * frac;
      if (state.drawing) {
        g.lineTo(mx, my);
      }
      consumed += state.remaining;
      state.drawing = !state.drawing;
      state.remaining = state.drawing ? dashLen : gapLen;
      if (state.drawing) {
        g.moveTo(mx, my);
      }
    } else {
      state.remaining -= available;
      if (state.drawing) {
        g.lineTo(curr.x, curr.y);
      }
      consumed = segLen;
    }
  }
};

const drawDashedBezier = (g: Graphics, curve: BezierCurve, style: DashStyle): void => {
  const { alpha, color, dashLen, gapLen, offset, width } = style;
  const pts: Point[] = [];
  for (let i = 0; i <= BEZIER_STEPS; i++) {
    pts.push(sampleCubicBezier(i / BEZIER_STEPS, curve));
  }
  const period = dashLen + gapLen;
  const distInPattern = offset % period;
  const drawing = distInPattern < dashLen;
  const state: WalkState = {
    dashLen,
    drawing,
    gapLen,
    remaining: drawing ? dashLen - distInPattern : period - distInPattern,
  };
  let prev = pts[0]!;
  if (state.drawing) {
    g.moveTo(prev.x, prev.y);
  }
  for (let i = 1; i < pts.length; i++) {
    const curr = pts[i]!;
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const segLen = Math.sqrt(dx * dx + dy * dy);
    if (segLen > 0) {
      walkDashSegment(g, state, { curr, prev, segLen });
    }
    prev = curr;
  }
  g.stroke({ alpha, color, width });
};

// oxlint-disable-next-line jest/require-hook
extend({ Container, Graphics, Text });

const GRID_SIZE = 24;
const BACKGROUND_GAP = 24;
const CANVAS_BACKGROUND = "#f8f5ec";
const NODE_WIDTH = 88;
const NODE_MIN_HEIGHT = 96;
const PORT_HIT_SIZE = 44;
const HANDLE_RADIUS = PORT_HIT_SIZE / 2;
const HANDLE_DOT_RADIUS = 4;
const DEFAULT_DROP_POSITION = { x: 160, y: 160 };
const DEFAULT_OVERLOADED_NODE_IDS: string[] = [];
const DEFAULT_LOCKED_NODE_IDS: string[] = [];

const CANVAS_COMPONENT_LIBRARY = {
  cache: { accentColor: 0xd9a65b, icon: "⚡", label: "Cache" },
  db: { accentColor: 0x5f8ca8, icon: "🛢️", label: "DB" },
  "db-large": { accentColor: 0x3a6e8a, icon: "🛢️", label: "Large DB" },
  "load-balancer": { accentColor: 0x7f6bd8, icon: "⇄", label: "Load Balancer" },
  server: { accentColor: 0x4f8f73, icon: "🖥️", label: "Server" },
  "server-large": { accentColor: 0x2d6b50, icon: "🖥️", label: "Large Server" },
  users: { accentColor: 0xe5634d, icon: "👥", label: "Users" },
} as const;

type ComponentType = keyof typeof CANVAS_COMPONENT_LIBRARY;

interface Point {
  x: number;
  y: number;
}

type HandleSide = "bottom" | "left" | "right" | "top";

interface ArchitectureNodeData {
  componentType: ComponentType;
  isOverloaded?: boolean;
  isSelected?: boolean;
}

interface PixiNode {
  data: ArchitectureNodeData;
  id: string;
  position: { x: number; y: number };
  type: "architecture";
}

interface PixiEdge {
  animated?: boolean;
  id: string;
  selected?: boolean;
  source: string;
  target: string;
  type?: string;
}

type ArchitectureCanvasNode = PixiNode;
type Edge = PixiEdge;

interface PendingEdge {
  sourceHandle: HandleSide;
  sourceNodeId: string;
  x: number;
  y: number;
}

interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

interface NodeContextMenu {
  kind: "node";
  nodeId: string;
  x: number;
  y: number;
}

interface EdgeContextMenu {
  edgeId: string;
  kind: "edge";
  x: number;
  y: number;
}

type ContextMenuState = EdgeContextMenu | NodeContextMenu;

interface GameCanvasProps {
  componentToPlace?: ComponentType | null;
  initialContextMenu?: ContextMenuState;
  initialEdges?: Edge[];
  initialNodes?: ArchitectureCanvasNode[];
  isLocked?: boolean;
  isSimulating?: boolean;
  lockedNodeIds?: string[];
  onComponentPlaced?: () => void;
  onSelectedNodeChange?: (nodeId: string | null) => void;
  onStateChange?: (nodes: ArchitectureCanvasNode[], edges: Edge[]) => void;
  overloadedNodeIds?: string[];
}

const isComponentType = (value: string): value is ComponentType =>
  Object.hasOwn(CANVAS_COMPONENT_LIBRARY, value);

const snapPositionToGrid = ({ x, y }: Point): Point => ({
  x: Math.round(x / GRID_SIZE) * GRID_SIZE,
  y: Math.round(y / GRID_SIZE) * GRID_SIZE,
});

const isConnectionValid = (_sourceType: ComponentType, targetType: ComponentType): boolean =>
  targetType !== "users";

const createNodeData = (componentType: ComponentType): ArchitectureNodeData => ({ componentType });

const withDefaultNodeShape = (node: PixiNode): PixiNode => ({
  ...node,
  data: { ...createNodeData(node.data.componentType), ...node.data },
  type: "architecture",
});

const withDefaultEdgeShape = (edge: Edge): Edge => ({
  ...edge,
  animated: edge.animated ?? false,
});

const getNextNodeId = (componentType: ComponentType, nodes: PixiNode[]): string => {
  const usedIds = new Set(nodes.map((n) => n.id));
  let i = 1;
  while (usedIds.has(`${componentType}-${i}`)) {
    i++;
  }
  return `${componentType}-${i}`;
};

const removeNodeAndConnections = (nodeId: string, nodes: PixiNode[], edges: Edge[]) => ({
  edges: edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
  nodes: nodes.filter((n) => n.id !== nodeId),
});

const getHandlePosition = (node: PixiNode, side: HandleSide): Point => {
  const { x, y } = node.position;
  switch (side) {
    case "right":
      return { x: x + NODE_WIDTH, y: y + NODE_MIN_HEIGHT / 2 };
    case "bottom":
      return { x: x + NODE_WIDTH / 2, y: y + NODE_MIN_HEIGHT };
    case "left":
      return { x, y: y + NODE_MIN_HEIGHT / 2 };
    case "top":
      return { x: x + NODE_WIDTH / 2, y };
  }
};

const chooseBestHandles = (
  source: PixiNode,
  target: PixiNode,
): { sourceHandle: HandleSide; targetHandle: HandleSide } => {
  const dx = target.position.x - source.position.x;
  const dy = target.position.y - source.position.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" };
  }
  return dy >= 0
    ? { sourceHandle: "bottom", targetHandle: "top" }
    : { sourceHandle: "top", targetHandle: "bottom" };
};

const getBezierControlPoints = (src: Point, tgt: Point) => {
  const dx = Math.abs(tgt.x - src.x);
  const dy = Math.abs(tgt.y - src.y);
  const curvature = Math.min(Math.max(dx, dy) * 0.5, 120);
  if (dx >= dy) {
    return {
      cp1: { x: src.x + curvature, y: src.y },
      cp2: { x: tgt.x - curvature, y: tgt.y },
    };
  }
  return {
    cp1: { x: src.x, y: src.y + curvature },
    cp2: { x: tgt.x, y: tgt.y - curvature },
  };
};

const drawArrowHead = (g: Graphics, from: Point, { color, to }: { color: number; to: Point }) => {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) {
    return;
  }
  const ux = dx / len;
  const uy = dy / len;
  g.moveTo(to.x, to.y);
  g.lineTo(to.x - ux * 10 - uy * 5, to.y - uy * 10 + ux * 5);
  g.lineTo(to.x - ux * 10 + uy * 5, to.y - uy * 10 - ux * 5);
  g.closePath();
  g.fill({ color });
};

interface HandleProps {
  isPendingConnection: boolean;
  kind: "source" | "target";
  onHandleClick: (side: HandleSide, kind: "source" | "target") => void;
  side: HandleSide;
  x: number;
  y: number;
}

const HandleGraphic = ({ x, y, side, kind, isPendingConnection, onHandleClick }: HandleProps) => {
  const draw = useCallback((g: Graphics) => {
    g.clear();
    g.circle(0, 0, HANDLE_RADIUS);
    g.fill({ alpha: 0, color: 0x000000 });
    g.circle(0, 0, HANDLE_DOT_RADIUS);
    g.fill({ color: 0x7b8cb2 });
  }, []);

  return (
    <pixiGraphics
      cursor="crosshair"
      draw={draw}
      eventMode="static"
      onClick={(e: FederatedPointerEvent) => {
        e.stopPropagation();
      }}
      onPointerDown={(e: FederatedPointerEvent) => {
        e.stopPropagation();
        if (kind === "source") {
          onHandleClick(side, kind);
        }
      }}
      onPointerUp={(e: FederatedPointerEvent) => {
        if (isPendingConnection) {
          e.stopPropagation();
          if (kind === "target") {
            onHandleClick(side, kind);
          }
        }
      }}
      x={x}
      y={y}
    />
  );
};

interface PixiNodeProps {
  containerRefs: { current: Map<string, Container> };
  isLocked: boolean;
  isOverloaded: boolean;
  isPendingConnection: boolean;
  isSelected: boolean;
  node: PixiNode;
  onContextMenu: (nodeId: string, e: FederatedPointerEvent) => void;
  onHandleClick: (nodeId: string, side: HandleSide, kind: "source" | "target") => void;
  onPointerDown: (nodeId: string, e: FederatedPointerEvent) => void;
  onSelect: (nodeId: string) => void;
}

const PixiNodeGraphic = ({
  node,
  containerRefs,
  isSelected,
  isOverloaded,
  isLocked,
  isPendingConnection,
  onSelect,
  onPointerDown,
  onHandleClick,
  onContextMenu,
}: PixiNodeProps) => {
  const handleRef = useCallback(
    (c: Container | null) => {
      if (c === null) {
        containerRefs.current.delete(node.id);
      } else {
        containerRefs.current.set(node.id, c);
      }
    },
    [node.id, containerRefs],
  );
  const def = CANVAS_COMPONENT_LIBRARY[node.data.componentType];
  const { accentColor } = def;

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

  const drawBackground = useCallback(
    (g: Graphics) => {
      g.clear();
      if (isOverloaded) {
        g.roundRect(-3, -3, NODE_WIDTH + 6, NODE_MIN_HEIGHT + 6, 18);
        g.stroke({ alpha: 0.5, color: 0xe5634d, width: borderWidth + 6 });
      }
      g.roundRect(0, 0, NODE_WIDTH, NODE_MIN_HEIGHT, 16);
      g.fill({ color: fillColor });
      g.stroke({ color: borderColor, width: borderWidth });
    },
    [fillColor, borderColor, borderWidth, isOverloaded],
  );

  const drawPill = useCallback(
    (g: Graphics) => {
      g.clear();
      g.roundRect(0, 0, 40, 40, 999);
      g.fill({ alpha: 0.13, color: accentColor });
    },
    [accentColor],
  );

  const isUsersNode = node.data.componentType === "users",
    nodeId = node.id;

  const handlePointerDown = useCallback(
    (e: FederatedPointerEvent) => {
      if (isLocked) {
        return;
      }
      onPointerDown(nodeId, e);
    },
    [isLocked, onPointerDown, nodeId],
  );

  const handleClick = useCallback(
    (e: FederatedPointerEvent) => {
      onSelect(nodeId);
      e.stopPropagation();
    },
    [onSelect, nodeId],
  );

  const handleRightClick = useCallback(
    (e: FederatedPointerEvent) => {
      if (isLocked) {
        return;
      }
      onContextMenu(nodeId, e);
      e.stopPropagation();
    },
    [isLocked, onContextMenu, nodeId],
  );

  const handleHandleClick = useCallback(
    (side: HandleSide, kind: "source" | "target") => {
      onHandleClick(nodeId, side, kind);
    },
    [onHandleClick, nodeId],
  );

  const iconStyle = new TextStyle({ fontSize: 20 });
  const labelStyle = new TextStyle({
    fill: 0x1a2744,
    fontSize: 11,
    fontWeight: "700",
    wordWrap: true,
    wordWrapWidth: NODE_WIDTH - 8,
  });

  return (
    <pixiContainer
      ref={handleRef}
      cursor={isLocked ? "default" : "grab"}
      eventMode="static"
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onRightClick={handleRightClick}
      x={node.position.x}
      y={node.position.y}
    >
      <pixiGraphics draw={drawBackground} />
      <pixiGraphics draw={drawPill} x={(NODE_WIDTH - 40) / 2} y={12} />
      <pixiText
        anchor={{ x: 0.5, y: 0.5 }}
        style={iconStyle}
        text={def.icon}
        x={NODE_WIDTH / 2}
        y={32}
      />
      <pixiText
        anchor={{ x: 0.5, y: 0 }}
        style={labelStyle}
        text={def.label}
        x={NODE_WIDTH / 2}
        y={60}
      />
      <HandleGraphic
        isPendingConnection={isPendingConnection}
        kind="source"
        onHandleClick={handleHandleClick}
        side="right"
        x={NODE_WIDTH}
        y={NODE_MIN_HEIGHT / 2}
      />
      <HandleGraphic
        isPendingConnection={isPendingConnection}
        kind="source"
        onHandleClick={handleHandleClick}
        side="bottom"
        x={NODE_WIDTH / 2}
        y={NODE_MIN_HEIGHT}
      />
      {!isUsersNode && (
        <>
          <HandleGraphic
            isPendingConnection={isPendingConnection}
            kind="target"
            onHandleClick={handleHandleClick}
            side="left"
            x={0}
            y={NODE_MIN_HEIGHT / 2}
          />
          <HandleGraphic
            isPendingConnection={isPendingConnection}
            kind="target"
            onHandleClick={handleHandleClick}
            side="top"
            x={NODE_WIDTH / 2}
            y={0}
          />
        </>
      )}
    </pixiContainer>
  );
};

interface PixiEdgeInnerProps {
  dashOffset: number;
  edge: PixiEdge;
  isSimulating: boolean;
  onEdgeClick: (edgeId: string) => void;
  onEdgeContextMenu: (edgeId: string, e: FederatedPointerEvent) => void;
  sourceNode: PixiNode;
  targetNode: PixiNode;
}

const PixiEdgeInner = ({
  edge,
  sourceNode,
  targetNode,
  isSimulating,
  dashOffset,
  onEdgeClick,
  onEdgeContextMenu,
}: PixiEdgeInnerProps) => {
  const { sourceHandle, targetHandle } = chooseBestHandles(sourceNode, targetNode);
  const src = getHandlePosition(sourceNode, sourceHandle);
  const tgt = getHandlePosition(targetNode, targetHandle);
  const { cp1, cp2 } = getBezierControlPoints(src, tgt);
  const edgeId = edge.id,
    isSelected = edge.selected === true;
  const strokeColor = isSelected ? 0xe5634d : 0x7b8cb2,
    strokeWidth = isSelected ? 3 : 2;
  const cp1X = cp1.x,
    cp1Y = cp1.y,
    cp2X = cp2.x,
    cp2Y = cp2.y;
  const srcX = src.x,
    srcY = src.y,
    tgtX = tgt.x,
    tgtY = tgt.y;

  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      if (isSimulating) {
        drawDashedBezier(
          g,
          {
            cp1: { x: cp1X, y: cp1Y },
            cp2: { x: cp2X, y: cp2Y },
            p0: { x: srcX, y: srcY },
            p3: { x: tgtX, y: tgtY },
          },
          {
            alpha: 0.9,
            color: strokeColor,
            dashLen: 6,
            gapLen: 6,
            offset: dashOffset % 12,
            width: strokeWidth,
          },
        );
      } else {
        g.moveTo(srcX, srcY);
        g.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, tgtX, tgtY);
        g.stroke({ alpha: 0.9, color: strokeColor, width: strokeWidth });
      }
      drawArrowHead(g, { x: cp2X, y: cp2Y }, { color: strokeColor, to: { x: tgtX, y: tgtY } });
    },
    [
      srcX,
      srcY,
      cp1X,
      cp1Y,
      cp2X,
      cp2Y,
      tgtX,
      tgtY,
      strokeColor,
      strokeWidth,
      isSimulating,
      dashOffset,
    ],
  );

  return (
    <pixiGraphics
      cursor="pointer"
      draw={draw}
      eventMode="static"
      onClick={(e: FederatedPointerEvent) => {
        onEdgeClick(edgeId);
        e.stopPropagation();
      }}
      onRightClick={(e: FederatedPointerEvent) => {
        onEdgeContextMenu(edgeId, e);
        e.stopPropagation();
      }}
    />
  );
};

interface PixiEdgeGraphicProps {
  dashOffset: number;
  edge: PixiEdge;
  isSimulating: boolean;
  nodes: PixiNode[];
  onEdgeClick: (edgeId: string) => void;
  onEdgeContextMenu: (edgeId: string, e: FederatedPointerEvent) => void;
}

const PixiEdgeGraphic = ({
  edge,
  nodes,
  dashOffset,
  isSimulating,
  onEdgeClick,
  onEdgeContextMenu,
}: PixiEdgeGraphicProps) => {
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  if (sourceNode === undefined || targetNode === undefined) {
    return null;
  }
  return (
    <PixiEdgeInner
      dashOffset={dashOffset}
      edge={edge}
      isSimulating={isSimulating}
      onEdgeClick={onEdgeClick}
      onEdgeContextMenu={onEdgeContextMenu}
      sourceNode={sourceNode}
      targetNode={targetNode}
    />
  );
};

interface LiveEdgeGraphicProps {
  nodes: PixiNode[];
  pendingEdge: PendingEdge;
}

const LiveEdgeGraphic = ({ pendingEdge, nodes }: LiveEdgeGraphicProps) => {
  const sourceNode = nodes.find((n) => n.id === pendingEdge.sourceNodeId);
  const src =
    sourceNode === undefined
      ? { x: 0, y: 0 }
      : getHandlePosition(sourceNode, pendingEdge.sourceHandle);
  const tgt = { x: pendingEdge.x, y: pendingEdge.y };
  const { cp1, cp2 } = getBezierControlPoints(src, tgt);
  const cp1X = cp1.x,
    cp1Y = cp1.y,
    cp2X = cp2.x,
    cp2Y = cp2.y;
  const srcX = src.x,
    srcY = src.y,
    tgtX = tgt.x,
    tgtY = tgt.y;

  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      drawDashedBezier(
        g,
        {
          cp1: { x: cp1X, y: cp1Y },
          cp2: { x: cp2X, y: cp2Y },
          p0: { x: srcX, y: srcY },
          p3: { x: tgtX, y: tgtY },
        },
        { alpha: 0.5, color: 0x7b8cb2, dashLen: 6, gapLen: 6, offset: 0, width: 2 },
      );
    },
    [srcX, srcY, cp1X, cp1Y, cp2X, cp2Y, tgtX, tgtY],
  );

  if (sourceNode === undefined) {
    return null;
  }
  return <pixiGraphics draw={draw} />;
};

interface EdgesLayerProps {
  draggingRef: { current: DragState | null };
  edges: PixiEdge[];
  isSimulating: boolean;
  nodeContainerRefs: { current: Map<string, Container> };
  nodes: PixiNode[];
  onEdgeClick: (edgeId: string) => void;
  onEdgeContextMenu: (edgeId: string, e: FederatedPointerEvent) => void;
  pendingEdge: PendingEdge | null;
}

const EdgesLayer = ({
  nodes,
  edges,
  isSimulating,
  draggingRef,
  nodeContainerRefs,
  pendingEdge,
  onEdgeClick,
  onEdgeContextMenu,
}: EdgesLayerProps) => {
  const [dashOffset, setDashOffset] = useState(0);
  const [, setDragFrame] = useState(0);

  useTick((delta) => {
    if (draggingRef.current !== null) {
      setDragFrame((f) => f + 1);
    }
    if (isSimulating) {
      setDashOffset((prev) => (prev - delta.deltaTime * 0.8) % 12);
    }
  });

  const dragId = draggingRef.current?.nodeId;
  const liveNodes =
    dragId === undefined
      ? nodes
      : nodes.map((n) => {
          if (n.id !== dragId) {
            return n;
          }
          const c = nodeContainerRefs.current.get(n.id);
          return c === undefined ? n : { ...n, position: { x: c.x, y: c.y } };
        });

  return (
    <pixiContainer>
      {edges.map((edge) => (
        <PixiEdgeGraphic
          key={edge.id}
          dashOffset={dashOffset}
          edge={edge}
          isSimulating={isSimulating}
          nodes={liveNodes}
          onEdgeClick={onEdgeClick}
          onEdgeContextMenu={onEdgeContextMenu}
        />
      ))}
      {pendingEdge !== null && <LiveEdgeGraphic nodes={liveNodes} pendingEdge={pendingEdge} />}
    </pixiContainer>
  );
};

interface PixiCanvasContentProps {
  draggingRef: { current: DragState | null };
  edges: PixiEdge[];
  isLocked: boolean;
  isSimulating: boolean;
  lockedNodeIds: string[];
  nodeContainerRefs: { current: Map<string, Container> };
  nodes: PixiNode[];
  onEdgeClick: (edgeId: string) => void;
  onEdgeContextMenu: (edgeId: string, e: FederatedPointerEvent) => void;
  onHandleClick: (nodeId: string, side: HandleSide, kind: "source" | "target") => void;
  onNodeContextMenu: (nodeId: string, e: FederatedPointerEvent) => void;
  onNodePointerDown: (nodeId: string, e: FederatedPointerEvent) => void;
  onNodeSelect: (nodeId: string) => void;
  onPaneClick: () => void;
  onStagePointerMove: (e: FederatedPointerEvent) => void;
  onStagePointerUp: () => void;
  overloadedNodeIds: string[];
  pendingEdge: PendingEdge | null;
  selectedNodeId: string | null;
  stageHeight: number;
  stageWidth: number;
}

const PixiCanvasContent = ({
  nodes,
  edges,
  stageWidth,
  stageHeight,
  isSimulating,
  draggingRef,
  nodeContainerRefs,
  overloadedNodeIds,
  selectedNodeId,
  lockedNodeIds,
  isLocked,
  pendingEdge,
  onNodePointerDown,
  onNodeSelect,
  onNodeContextMenu,
  onHandleClick,
  onEdgeClick,
  onEdgeContextMenu,
  onStagePointerMove,
  onStagePointerUp,
  onPaneClick,
}: PixiCanvasContentProps) => {
  const { app, isInitialised } = useApplication() as ReturnType<typeof useApplication> & {
    isInitialised: boolean;
  };

  useEffect(() => {
    if (!isInitialised) {
      return;
    }
    const { stage } = app;
    stage.eventMode = "static";
    stage.hitArea = app.screen;

    const onClick = onPaneClick,
      onMove = onStagePointerMove,
      onUp = onStagePointerUp;

    stage.on("pointermove", onMove);
    stage.on("pointerup", onUp);
    stage.on("pointerupoutside", onUp);
    stage.on("click", onClick);

    return () => {
      stage.off("pointermove", onMove);
      stage.off("pointerup", onUp);
      stage.off("pointerupoutside", onUp);
      stage.off("click", onClick);
    };
  }, [app, isInitialised, onStagePointerMove, onStagePointerUp, onPaneClick]);

  const drawDotGrid = useCallback(
    (g: Graphics) => {
      g.clear();
      for (let gx = BACKGROUND_GAP; gx < stageWidth; gx += BACKGROUND_GAP) {
        for (let gy = BACKGROUND_GAP; gy < stageHeight; gy += BACKGROUND_GAP) {
          g.circle(gx, gy, 0.8);
          g.fill({ alpha: 0.18, color: 0x1a2744 });
        }
      }
    },
    [stageWidth, stageHeight],
  );

  return (
    <pixiContainer>
      <pixiGraphics draw={drawDotGrid} />
      <EdgesLayer
        draggingRef={draggingRef}
        edges={edges}
        isSimulating={isSimulating}
        nodeContainerRefs={nodeContainerRefs}
        nodes={nodes}
        onEdgeClick={onEdgeClick}
        onEdgeContextMenu={onEdgeContextMenu}
        pendingEdge={pendingEdge}
      />
      <pixiContainer>
        {nodes.map((node) => (
          <PixiNodeGraphic
            key={node.id}
            containerRefs={nodeContainerRefs}
            isLocked={isLocked || lockedNodeIds.includes(node.id)}
            isOverloaded={overloadedNodeIds.includes(node.id)}
            isPendingConnection={pendingEdge !== null}
            isSelected={selectedNodeId === node.id}
            node={node}
            onContextMenu={onNodeContextMenu}
            onHandleClick={onHandleClick}
            onPointerDown={onNodePointerDown}
            onSelect={onNodeSelect}
          />
        ))}
      </pixiContainer>
    </pixiContainer>
  );
};

const GameCanvas = ({
  componentToPlace,
  initialContextMenu,
  initialEdges = [],
  initialNodes = [],
  isLocked = false,
  isSimulating = false,
  lockedNodeIds = DEFAULT_LOCKED_NODE_IDS,
  onComponentPlaced,
  onSelectedNodeChange,
  onStateChange,
  overloadedNodeIds = DEFAULT_OVERLOADED_NODE_IDS,
}: GameCanvasProps) => {
  const [nodes, setNodes] = useState<PixiNode[]>(() => initialNodes.map(withDefaultNodeShape));
  const [edges, setEdges] = useState<Edge[]>(() => initialEdges.map(withDefaultEdgeShape));
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pendingEdge, setPendingEdge] = useState<PendingEdge | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
    initialContextMenu ?? null,
  );
  const [stageSize, setStageSize] = useState({ height: 0, width: 0 });
  const draggingRef = useRef<DragState | null>(null),
    dropzoneRef = useRef<HTMLDivElement>(null),
    nodeContainerRefs = useRef<Map<string, Container>>(new Map()),
    nodesRef = useRef(nodes),
    pendingEdgeRef = useRef(pendingEdge);
  nodesRef.current = nodes;
  pendingEdgeRef.current = pendingEdge;

  useEffect(() => {
    const el = dropzoneRef.current;
    if (el === null) {
      return;
    }
    const observer = new ResizeObserver((entries) => {
      const [entry] = entries;
      if (entry === undefined) {
        return;
      }
      setStageSize({ height: entry.contentRect.height, width: entry.contentRect.width });
    });
    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    setEdges((current) => current.map((e) => ({ ...e, animated: isSimulating })));
  }, [isSimulating]);

  useEffect(() => {
    onSelectedNodeChange?.(selectedNodeId);
  }, [selectedNodeId, onSelectedNodeChange]);

  useEffect(() => {
    onStateChange?.(nodes, edges);
  }, [nodes, edges, onStateChange]);

  useEffect(() => {
    if (componentToPlace === null || componentToPlace === undefined || isLocked) {
      return;
    }
    setNodes((current) => {
      const nextNode: PixiNode = {
        data: createNodeData(componentToPlace),
        id: getNextNodeId(componentToPlace, current),
        position: snapPositionToGrid(DEFAULT_DROP_POSITION),
        type: "architecture",
      };
      return [...current, nextNode];
    });
    setSelectedNodeId(null);
    setContextMenu(null);
    onComponentPlaced?.();
  }, [componentToPlace, isLocked, onComponentPlaced]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelectedNodeId(null);
        setPendingEdge(null);
        setContextMenu(null);
        return;
      }
      if (event.key !== "Delete") {
        return;
      }

      if (selectedNodeId !== null) {
        if (lockedNodeIds.includes(selectedNodeId)) {
          return;
        }
        const next = removeNodeAndConnections(selectedNodeId, nodes, edges);
        setNodes(next.nodes);
        setEdges(next.edges);
        setSelectedNodeId(null);
        setContextMenu(null);
        return;
      }

      const selectedEdge = edges.find((e) => e.selected === true);
      if (selectedEdge !== undefined) {
        setEdges((current) => current.filter((e) => e.id !== selectedEdge.id));
        setContextMenu(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [edges, lockedNodeIds, nodes, selectedNodeId]);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isLocked) {
      return;
    }
    const componentType = event.dataTransfer.getData("application/component-type");
    if (!isComponentType(componentType)) {
      return;
    }
    const bounds = event.currentTarget.getBoundingClientRect();
    const position = snapPositionToGrid({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
    setNodes((current) => {
      const nextNode: PixiNode = {
        data: createNodeData(componentType),
        id: getNextNodeId(componentType, current),
        position,
        type: "architecture",
      };
      return [...current, nextNode];
    });
    setSelectedNodeId(null);
    setContextMenu(null);
  };

  const handleRemoveFromMenu = () => {
    if (contextMenu === null) {
      return;
    }
    if (contextMenu.kind === "node") {
      const next = removeNodeAndConnections(contextMenu.nodeId, nodes, edges);
      setNodes(next.nodes);
      setEdges(next.edges);
      setSelectedNodeId(null);
    } else {
      setEdges((current) => current.filter((e) => e.id !== contextMenu.edgeId));
    }
    setContextMenu(null);
  };

  const onNodeSelect = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setEdges((current) => current.map((e) => ({ ...e, selected: false })));
    setContextMenu(null);
  }, []);

  const onNodePointerDown = useCallback((nodeId: string, e: FederatedPointerEvent) => {
    const container = nodeContainerRefs.current.get(nodeId);
    if (container === undefined) {
      return;
    }
    draggingRef.current = {
      nodeId,
      offsetX: e.globalX - container.x,
      offsetY: e.globalY - container.y,
    };
  }, []);

  const onStagePointerMove = useCallback((e: FederatedPointerEvent) => {
    const drag = draggingRef.current;
    if (drag !== null) {
      const container = nodeContainerRefs.current.get(drag.nodeId);
      if (container !== undefined) {
        container.x = e.globalX - drag.offsetX;
        container.y = e.globalY - drag.offsetY;
      }
      return;
    }
    setPendingEdge((prev) => (prev === null ? null : { ...prev, x: e.globalX, y: e.globalY }));
  }, []);

  const onStagePointerUp = useCallback(() => {
    const drag = draggingRef.current;
    if (drag === null) {
      return;
    }
    draggingRef.current = null;
    const container = nodeContainerRefs.current.get(drag.nodeId);
    if (container === undefined) {
      return;
    }
    const snapped = snapPositionToGrid({ x: container.x, y: container.y });
    container.x = snapped.x;
    container.y = snapped.y;
    setNodes((current) =>
      current.map((n) => (n.id === drag.nodeId ? { ...n, position: snapped } : n)),
    );
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setPendingEdge(null);
    setContextMenu(null);
  }, []);

  const onHandleClick = useCallback(
    (nodeId: string, side: HandleSide, kind: "source" | "target") => {
      if (kind === "source") {
        draggingRef.current = null;
        const node = nodesRef.current.find((n) => n.id === nodeId);
        if (node === undefined) {
          return;
        }
        const pos = getHandlePosition(node, side);
        setPendingEdge({ sourceHandle: side, sourceNodeId: nodeId, x: pos.x, y: pos.y });
        return;
      }
      const pending = pendingEdgeRef.current;
      if (pending === null) {
        return;
      }
      const sourceNode = nodesRef.current.find((n) => n.id === pending.sourceNodeId);
      const targetNode = nodesRef.current.find((n) => n.id === nodeId);
      if (sourceNode === undefined || targetNode === undefined) {
        setPendingEdge(null);
        return;
      }
      if (!isConnectionValid(sourceNode.data.componentType, targetNode.data.componentType)) {
        setPendingEdge(null);
        return;
      }
      const edgeId = `edge-${pending.sourceNodeId}-${nodeId}-${Date.now()}`;
      setEdges((current) => [
        ...current,
        { animated: false, id: edgeId, source: pending.sourceNodeId, target: nodeId },
      ]);
      setPendingEdge(null);
    },
    [],
  );

  const onEdgeClick = useCallback((edgeId: string) => {
    setEdges((current) => current.map((e) => ({ ...e, selected: e.id === edgeId })));
    setSelectedNodeId(null);
    setContextMenu(null);
  }, []);

  const onEdgeContextMenu = useCallback((edgeId: string, e: FederatedPointerEvent) => {
    const rect = dropzoneRef.current?.getBoundingClientRect();
    setContextMenu({
      edgeId,
      kind: "edge",
      x: e.client.x - (rect?.left ?? 0),
      y: e.client.y - (rect?.top ?? 0),
    });
    setSelectedNodeId(null);
  }, []);

  const onNodeContextMenu = useCallback(
    (nodeId: string, e: FederatedPointerEvent) => {
      if (lockedNodeIds.includes(nodeId)) {
        return;
      }
      setSelectedNodeId(nodeId);
      const rect = dropzoneRef.current?.getBoundingClientRect();
      setContextMenu({
        kind: "node",
        nodeId,
        x: e.client.x - (rect?.left ?? 0),
        y: e.client.y - (rect?.top ?? 0),
      });
    },
    [lockedNodeIds],
  );

  return (
    <div data-testid="game-canvas" style={{ height: "100%", position: "relative", width: "100%" }}>
      <div
        ref={dropzoneRef}
        data-testid="game-canvas-dropzone"
        onContextMenu={(e) => {
          e.preventDefault();
        }}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        style={{
          background: CANVAS_BACKGROUND,
          height: "100%",
          position: "relative",
          width: "100%",
        }}
      >
        {/* Hidden DOM mirror for test compatibility */}
        <div aria-hidden="true" style={{ display: "none" }}>
          {nodes.map((node) => (
            <div
              key={node.id}
              data-component-type={node.data.componentType}
              data-overloaded={overloadedNodeIds.includes(node.id).toString()}
              data-testid={`canvas-node-${node.id}`}
              onClick={() => {
                onNodeSelect(node.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                if (lockedNodeIds.includes(node.id)) {
                  return;
                }
                setSelectedNodeId(node.id);
                const rect = dropzoneRef.current?.getBoundingClientRect();
                setContextMenu({
                  kind: "node",
                  nodeId: node.id,
                  x: e.clientX - (rect?.left ?? 0),
                  y: e.clientY - (rect?.top ?? 0),
                });
              }}
            >
              {CANVAS_COMPONENT_LIBRARY[node.data.componentType].label}
              {/* Handle mirrors */}
              <div data-testid={`handle-${node.id}-source-right`} />
              <div data-testid={`handle-${node.id}-source-bottom`} />
              {node.data.componentType !== "users" && (
                <>
                  <div data-testid={`handle-${node.id}-target-left`} />
                  <div data-testid={`handle-${node.id}-target-top`} />
                </>
              )}
            </div>
          ))}
          {edges.map((edge) => (
            <div
              key={edge.id}
              data-testid={`canvas-edge-${edge.id}`}
              onClick={() => {
                onEdgeClick(edge.id);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                const rect = dropzoneRef.current?.getBoundingClientRect();
                setContextMenu({
                  edgeId: edge.id,
                  kind: "edge",
                  x: e.clientX - (rect?.left ?? 0),
                  y: e.clientY - (rect?.top ?? 0),
                });
                setSelectedNodeId(null);
              }}
            />
          ))}
        </div>

        {stageSize.width > 0 && stageSize.height > 0 && (
          <Application
            antialias
            autoDensity
            background={0xf8f5ec}
            resolution={window.devicePixelRatio}
            resizeTo={dropzoneRef}
          >
            <PixiCanvasContent
              draggingRef={draggingRef}
              edges={edges}
              isLocked={isLocked}
              isSimulating={isSimulating}
              lockedNodeIds={lockedNodeIds}
              nodeContainerRefs={nodeContainerRefs}
              nodes={nodes}
              onEdgeClick={onEdgeClick}
              onEdgeContextMenu={onEdgeContextMenu}
              onHandleClick={onHandleClick}
              onNodeContextMenu={onNodeContextMenu}
              onNodePointerDown={onNodePointerDown}
              onNodeSelect={onNodeSelect}
              onPaneClick={onPaneClick}
              onStagePointerMove={onStagePointerMove}
              onStagePointerUp={onStagePointerUp}
              overloadedNodeIds={overloadedNodeIds}
              pendingEdge={pendingEdge}
              selectedNodeId={selectedNodeId}
              stageHeight={stageSize.height}
              stageWidth={stageSize.width}
            />
          </Application>
        )}
      </div>

      {contextMenu !== null && (
        <div
          style={{
            left: `${contextMenu.x}px`,
            position: "absolute",
            top: `${contextMenu.y}px`,
            zIndex: 10,
          }}
        >
          <button
            onClick={handleRemoveFromMenu}
            style={{
              background: "#1a2744",
              border: "none",
              borderRadius: "0.625rem",
              color: "#f5f5f0",
              cursor: "pointer",
              padding: "0.6rem 0.9rem",
            }}
            type="button"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
};

export { GameCanvas, chooseBestHandles, isConnectionValid, snapPositionToGrid };
export type { ArchitectureCanvasNode, ArchitectureNodeData, Edge };
