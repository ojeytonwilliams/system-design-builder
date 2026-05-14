import { useTick } from "@pixi/react";
import type { Container, FederatedPointerEvent, Graphics } from "pixi.js";
import { useCallback, useState } from "react";
import { drawArrowHead, drawDashedBezier, getBezierControlPoints } from "./bezier-utils.js";
import { chooseBestHandles, getHandlePosition } from "./canvas-logic.js";
import type { PixiEdge, PixiNode } from "./canvas-logic.js";

interface PendingEdge {
  sourceHandle: "bottom" | "left" | "right" | "top";
  sourceNodeId: string;
  x: number;
  y: number;
}

interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

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

export { EdgesLayer, LiveEdgeGraphic, PixiEdgeGraphic };
export type { DragState, EdgesLayerProps, PendingEdge };
