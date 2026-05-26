import { Application, extend, useApplication, useTick } from "@pixi/react";
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { FederatedPointerEvent } from "pixi.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { drawArrowHead, drawDashedBezier, getBezierControlPoints } from "./bezier-utils.js";
import { TICK_INTERVAL_MS } from "../../simulation/simulation-engine.js";
import type { SimulationEngine, SimulationSnapshot } from "../../simulation/simulation-engine.js";
import {
  chooseBestHandles,
  getHandlePosition,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  snapPositionToGrid,
} from "../../domain/canvas-logic.js";
import type { ArchitectureEdge, ArchitectureNode, HandleSide } from "../../domain/canvas-logic.js";
import { COMPONENT_LIBRARY } from "../../domain/component-library.js";
import { computeNodeFillRatio, getTransitDotPosition } from "./pixi-renderer-utils.js";

// oxlint-disable-next-line jest/require-hook
extend({ Container, Graphics, Text });

const BACKGROUND_GAP = 24;
const CANVAS_BACKGROUND = 0xf8f5ec;
const PORT_HIT_SIZE = 44;
const REQUEST_DOT_COLOR = 0xa8c4e8;
const RESPONSE_DOT_COLOR = 0x4fd47f;
const HANDLE_RADIUS = PORT_HIT_SIZE / 2;
const HANDLE_DOT_RADIUS = 4;

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
  x: number;
  y: number;
}

interface AnimState {
  alpha: number;
  snapshot: SimulationSnapshot;
}

interface CanvasPixiRendererProps {
  edges: ArchitectureEdge[];
  isLocked: boolean;
  isSimulating: boolean;
  lockedNodeIds: string[];
  nodes: ArchitectureNode[];
  onEdgeContextMenu: (edgeId: string, pos: { clientX: number; clientY: number }) => void;
  onEdgeCreated: (sourceNodeId: string, targetNodeId: string) => void;
  onEdgeSelect: (edgeId: string) => void;
  onNodeContextMenu: (nodeId: string, pos: { clientX: number; clientY: number }) => void;
  onNodeDragEnd: (nodeId: string, position: { x: number; y: number }) => void;
  onNodeSelect: (nodeId: string) => void;
  onPaneClick: () => void;
  engine: SimulationEngine;
  overloadedNodeIds: string[];
  resizeTo: { current: HTMLDivElement | null };
  selectedNodeId: string | null;
  stageHeight: number;
  stageWidth: number;
}

interface HandleGraphicProps {
  isPendingConnection: boolean;
  kind: "source" | "target";
  onHandleClick: (side: HandleSide, kind: "source" | "target") => void;
  side: HandleSide;
  x: number;
  y: number;
}

const HandleGraphic = ({
  x,
  y,
  side,
  kind,
  isPendingConnection,
  onHandleClick,
}: HandleGraphicProps) => {
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

interface PixiNodeGraphicProps {
  fillRatio: number;
  isLocked: boolean;
  isOverloaded: boolean;
  isPendingConnection: boolean;
  isSelected: boolean;
  node: ArchitectureNode;
  onContextMenu: (nodeId: string, pos: { clientX: number; clientY: number }) => void;
  onHandleClick: (nodeId: string, side: HandleSide, kind: "source" | "target") => void;
  onPointerDown: (
    nodeId: string,
    position: { x: number; y: number },
    e: FederatedPointerEvent,
  ) => void;
  onSelect: (nodeId: string) => void;
}

const PixiNodeGraphic = ({
  node,
  fillRatio,
  isSelected,
  isOverloaded,
  isLocked,
  isPendingConnection,
  onSelect,
  onPointerDown,
  onHandleClick,
  onContextMenu,
}: PixiNodeGraphicProps) => {
  const def = COMPONENT_LIBRARY[node.componentType];
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
      if (fillRatio > 0) {
        const fillHeight = NODE_MIN_HEIGHT * fillRatio;
        g.roundRect(0, NODE_MIN_HEIGHT - fillHeight, NODE_WIDTH, fillHeight, 16);
        g.fill({ alpha: 0.25, color: 0x7b8cb2 });
      }
      g.roundRect(0, 0, NODE_WIDTH, NODE_MIN_HEIGHT, 16);
      g.stroke({ color: borderColor, width: borderWidth });
    },
    [fillColor, borderColor, borderWidth, isOverloaded, fillRatio],
  );

  const drawPill = useCallback(
    (g: Graphics) => {
      g.clear();
      g.roundRect(0, 0, 40, 40, 999);
      g.fill({ alpha: 0.13, color: accentColor });
    },
    [accentColor],
  );

  const isUsersNode = node.componentType === "users",
    nodeId = node.id;

  const handlePointerDown = useCallback(
    (e: FederatedPointerEvent) => {
      if (isLocked) {
        return;
      }
      onPointerDown(nodeId, node.position, e);
    },
    [isLocked, onPointerDown, nodeId, node.position],
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
      onContextMenu(nodeId, { clientX: e.client.x, clientY: e.client.y });
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
      cursor={isLocked ? "default" : "grab"}
      data-label={def.label}
      data-overloaded={isOverloaded}
      data-testid={`canvas-node-${nodeId}`}
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
  edge: ArchitectureEdge;
  onEdgeClick: (edgeId: string) => void;
  onEdgeContextMenu: (edgeId: string, pos: { clientX: number; clientY: number }) => void;
  sourceNode: ArchitectureNode;
  targetNode: ArchitectureNode;
}

const PixiEdgeInner = ({
  edge,
  sourceNode,
  targetNode,
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
      g.moveTo(srcX, srcY);
      g.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, tgtX, tgtY);
      g.stroke({ alpha: 0.9, color: strokeColor, width: strokeWidth });
      drawArrowHead(g, { x: cp2X, y: cp2Y }, { color: strokeColor, to: { x: tgtX, y: tgtY } });
    },
    [srcX, srcY, cp1X, cp1Y, cp2X, cp2Y, tgtX, tgtY, strokeColor, strokeWidth],
  );

  return (
    <pixiGraphics
      cursor="pointer"
      data-testid={`canvas-edge-${edgeId}`}
      draw={draw}
      eventMode="static"
      onClick={(e: FederatedPointerEvent) => {
        onEdgeClick(edgeId);
        e.stopPropagation();
      }}
      onRightClick={(e: FederatedPointerEvent) => {
        onEdgeContextMenu(edgeId, { clientX: e.client.x, clientY: e.client.y });
        e.stopPropagation();
      }}
    />
  );
};

interface PixiEdgeGraphicProps {
  edge: ArchitectureEdge;
  nodes: ArchitectureNode[];
  onEdgeClick: (edgeId: string) => void;
  onEdgeContextMenu: (edgeId: string, pos: { clientX: number; clientY: number }) => void;
}

const PixiEdgeGraphic = ({ edge, nodes, onEdgeClick, onEdgeContextMenu }: PixiEdgeGraphicProps) => {
  const sourceNode = nodes.find((n) => n.id === edge.source);
  const targetNode = nodes.find((n) => n.id === edge.target);
  if (sourceNode === undefined || targetNode === undefined) {
    return null;
  }
  return (
    <PixiEdgeInner
      edge={edge}
      onEdgeClick={onEdgeClick}
      onEdgeContextMenu={onEdgeContextMenu}
      sourceNode={sourceNode}
      targetNode={targetNode}
    />
  );
};

interface LiveEdgeGraphicProps {
  nodes: ArchitectureNode[];
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

interface TransitDotsLayerProps {
  animRef: { current: AnimState };
  edges: ArchitectureEdge[];
  isSimulating: boolean;
  nodes: ArchitectureNode[];
}

const TransitDotsLayer = ({ animRef, edges, isSimulating, nodes }: TransitDotsLayerProps) => {
  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      if (!isSimulating) {
        return;
      }
      const { alpha, snapshot } = animRef.current;
      for (const [id, transit] of snapshot.transits) {
        const prev = snapshot.prevTransitProgresses.get(id) ?? transit.progress;
        const progress = prev + (transit.progress - prev) * alpha;
        const pos = getTransitDotPosition({ edgeId: transit.edgeId, progress }, edges, nodes);
        if (pos !== null) {
          g.circle(pos.x, pos.y, 4);
          g.fill({ alpha: 0.9, color: REQUEST_DOT_COLOR });
        }
      }
    },
    [animRef, edges, isSimulating, nodes],
  );

  return <pixiGraphics draw={draw} />;
};

interface ResponseTransitDotsLayerProps {
  animRef: { current: AnimState };
  edges: ArchitectureEdge[];
  isSimulating: boolean;
  nodes: ArchitectureNode[];
}

const ResponseTransitDotsLayer = ({
  animRef,
  edges,
  isSimulating,
  nodes,
}: ResponseTransitDotsLayerProps) => {
  const draw = useCallback(
    (g: Graphics) => {
      g.clear();
      if (!isSimulating) {
        return;
      }
      const { alpha, snapshot } = animRef.current;
      for (const [id, transit] of snapshot.responseTransits) {
        const prev = snapshot.prevResponseTransitProgresses.get(id) ?? transit.progress;
        const progress = prev + (transit.progress - prev) * alpha;
        const pos = getTransitDotPosition(
          { edgeId: transit.edgeId, progress: 1 - progress },
          edges,
          nodes,
        );
        if (pos !== null) {
          g.circle(pos.x, pos.y, 4);
          g.fill({ alpha: 0.9, color: RESPONSE_DOT_COLOR });
        }
      }
    },
    [animRef, edges, isSimulating, nodes],
  );

  return <pixiGraphics draw={draw} />;
};

interface EdgesLayerProps {
  edges: ArchitectureEdge[];
  nodes: ArchitectureNode[];
  onEdgeClick: (edgeId: string) => void;
  onEdgeContextMenu: (edgeId: string, pos: { clientX: number; clientY: number }) => void;
  pendingEdge: PendingEdge | null;
}

const EdgesLayer = ({
  nodes,
  edges,
  pendingEdge,
  onEdgeClick,
  onEdgeContextMenu,
}: EdgesLayerProps) => (
  <pixiContainer>
    {edges.map((edge) => (
      <PixiEdgeGraphic
        key={edge.id}
        edge={edge}
        nodes={nodes}
        onEdgeClick={onEdgeClick}
        onEdgeContextMenu={onEdgeContextMenu}
      />
    ))}
    {pendingEdge !== null && <LiveEdgeGraphic nodes={nodes} pendingEdge={pendingEdge} />}
  </pixiContainer>
);

interface PixiContentProps {
  edges: ArchitectureEdge[];
  engine: SimulationEngine;
  isLocked: boolean;
  isSimulating: boolean;
  lockedNodeIds: string[];
  nodes: ArchitectureNode[];
  onEdgeClick: (edgeId: string) => void;
  onEdgeContextMenu: (edgeId: string, pos: { clientX: number; clientY: number }) => void;
  onHandleClick: (nodeId: string, side: HandleSide, kind: "source" | "target") => void;
  onNodeContextMenu: (nodeId: string, pos: { clientX: number; clientY: number }) => void;
  onNodePointerDown: (
    nodeId: string,
    position: { x: number; y: number },
    e: FederatedPointerEvent,
  ) => void;
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

const PixiContent = ({
  nodes,
  edges,
  engine,
  stageWidth,
  stageHeight,
  isSimulating,
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
}: PixiContentProps) => {
  const { app, isInitialised } = useApplication() as ReturnType<typeof useApplication> & {
    isInitialised: boolean;
  };

  const accumulatorRef = useRef(0);
  const animRef = useRef<AnimState>({ alpha: 0, snapshot: engine.getSnapshot() });

  useTick((ticker) => {
    if (!isSimulating) {
      accumulatorRef.current = 0;
      return;
    }
    accumulatorRef.current += ticker.elapsedMS;
    while (accumulatorRef.current >= TICK_INTERVAL_MS) {
      engine.tick(TICK_INTERVAL_MS);
      accumulatorRef.current -= TICK_INTERVAL_MS;
    }
    animRef.current = {
      alpha: accumulatorRef.current / TICK_INTERVAL_MS,
      snapshot: engine.getSnapshot(),
    };
  });

  const { processing } = engine.getSnapshot();

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
        edges={edges}
        nodes={nodes}
        onEdgeClick={onEdgeClick}
        onEdgeContextMenu={onEdgeContextMenu}
        pendingEdge={pendingEdge}
      />
      <TransitDotsLayer animRef={animRef} edges={edges} isSimulating={isSimulating} nodes={nodes} />
      <ResponseTransitDotsLayer
        animRef={animRef}
        edges={edges}
        isSimulating={isSimulating}
        nodes={nodes}
      />
      <pixiContainer>
        {nodes.map((node) => (
          <PixiNodeGraphic
            key={node.id}
            fillRatio={computeNodeFillRatio(
              node.id,
              COMPONENT_LIBRARY[node.componentType].capacity,
              processing,
            )}
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

const CanvasPixiRenderer = ({
  nodes,
  edges,
  engine,
  selectedNodeId,
  stageWidth,
  stageHeight,
  isSimulating,
  isLocked,
  lockedNodeIds,
  overloadedNodeIds,
  resizeTo,
  onNodeSelect,
  onEdgeSelect,
  onNodeContextMenu,
  onEdgeContextMenu,
  onEdgeCreated,
  onNodeDragEnd,
  onPaneClick,
}: CanvasPixiRendererProps) => {
  const [pendingEdge, setPendingEdge] = useState<PendingEdge | null>(null);
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null);
  const draggingRef = useRef<DragState | null>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const pendingEdgeRef = useRef(pendingEdge);
  pendingEdgeRef.current = pendingEdge;

  const liveNodes =
    dragPos === null || draggingRef.current === null
      ? nodes
      : nodes.map((n) => {
          const drag = draggingRef.current!;
          if (n.id !== drag.nodeId) {
            return n;
          }
          return { ...n, position: { x: dragPos.x - drag.offsetX, y: dragPos.y - drag.offsetY } };
        });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPendingEdge(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const onNodePointerDown = useCallback(
    (nodeId: string, position: { x: number; y: number }, e: FederatedPointerEvent) => {
      draggingRef.current = {
        nodeId,
        offsetX: e.globalX - position.x,
        offsetY: e.globalY - position.y,
        x: e.globalX,
        y: e.globalY,
      };
      setDragPos({ x: e.globalX, y: e.globalY });
    },
    [],
  );

  const onStagePointerMove = useCallback((e: FederatedPointerEvent) => {
    if (draggingRef.current !== null) {
      draggingRef.current.x = e.globalX;
      draggingRef.current.y = e.globalY;
      setDragPos({ x: e.globalX, y: e.globalY });
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
    setDragPos(null);
    const snapped = snapPositionToGrid({ x: drag.x - drag.offsetX, y: drag.y - drag.offsetY });
    onNodeDragEnd(drag.nodeId, snapped);
  }, [onNodeDragEnd]);

  const onHandleClick = useCallback(
    (nodeId: string, side: HandleSide, kind: "source" | "target") => {
      if (kind === "source") {
        draggingRef.current = null;
        setDragPos(null);
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
      setPendingEdge(null);
      onEdgeCreated(pending.sourceNodeId, nodeId);
    },
    [onEdgeCreated],
  );

  const handlePaneClick = useCallback(() => {
    setPendingEdge(null);
    onPaneClick();
  }, [onPaneClick]);

  return (
    <Application
      antialias
      autoDensity
      background={CANVAS_BACKGROUND}
      resolution={window.devicePixelRatio}
      resizeTo={resizeTo}
    >
      <PixiContent
        edges={edges}
        isLocked={isLocked}
        isSimulating={isSimulating}
        lockedNodeIds={lockedNodeIds}
        nodes={liveNodes}
        onEdgeClick={onEdgeSelect}
        onEdgeContextMenu={onEdgeContextMenu}
        engine={engine}
        onHandleClick={onHandleClick}
        onNodeContextMenu={onNodeContextMenu}
        onNodePointerDown={onNodePointerDown}
        onNodeSelect={onNodeSelect}
        onPaneClick={handlePaneClick}
        onStagePointerMove={onStagePointerMove}
        onStagePointerUp={onStagePointerUp}
        overloadedNodeIds={overloadedNodeIds}
        pendingEdge={pendingEdge}
        selectedNodeId={selectedNodeId}
        stageHeight={stageHeight}
        stageWidth={stageWidth}
      />
    </Application>
  );
};

export { CanvasPixiRenderer };
