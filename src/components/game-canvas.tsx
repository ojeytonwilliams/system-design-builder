import { Application, useApplication } from "@pixi/react";
import type { Container, FederatedPointerEvent, Graphics } from "pixi.js";
import type { DragEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { COMPONENT_LIBRARY, isComponentType } from "./component-library.js";
import type { ComponentType } from "./component-library.js";
import { EdgesLayer } from "./canvas-edge-graphic.js";
import type { DragState, PendingEdge } from "./canvas-edge-graphic.js";
import {
  chooseBestHandles,
  createNodeData,
  DEFAULT_DROP_POSITION,
  DEFAULT_LOCKED_NODE_IDS,
  DEFAULT_OVERLOADED_NODE_IDS,
  getHandlePosition,
  getNextNodeId,
  isConnectionValid,
  removeNodeAndConnections,
  snapPositionToGrid,
  withDefaultEdgeShape,
  withDefaultNodeShape,
} from "./canvas-logic.js";
import type { ArchitectureNodeData, HandleSide, PixiEdge, PixiNode } from "./canvas-logic.js";
import { PixiNodeGraphic } from "./canvas-node-graphic.js";

const BACKGROUND_GAP = 24;
const CANVAS_BACKGROUND = "#f8f5ec";

type ArchitectureCanvasNode = PixiNode;
type Edge = PixiEdge;

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

interface DomMirrorProps {
  dropzoneRef: { current: HTMLDivElement | null };
  edges: Edge[];
  lockedNodeIds: string[];
  nodes: PixiNode[];
  onEdgeClick: (edgeId: string) => void;
  onNodeSelect: (nodeId: string) => void;
  overloadedNodeIds: string[];
  setContextMenu: (state: ContextMenuState | null) => void;
  setSelectedNodeId: (id: string | null) => void;
}

const DomMirror = ({
  nodes,
  edges,
  overloadedNodeIds,
  lockedNodeIds,
  dropzoneRef,
  onNodeSelect,
  onEdgeClick,
  setContextMenu,
  setSelectedNodeId,
}: DomMirrorProps) => (
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
        {COMPONENT_LIBRARY[node.data.componentType].label}
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
);

const useCanvasKeyboard = (
  graph: { edges: Edge[]; nodes: PixiNode[] },
  selectedNodeId: string | null,
  lockedNodeIds: string[],
  setters: {
    setContextMenu: (s: ContextMenuState | null) => void;
    setEdges: (fn: (current: Edge[]) => Edge[]) => void;
    setNodes: (fn: (current: PixiNode[]) => PixiNode[]) => void;
    setPendingEdge: (p: PendingEdge | null) => void;
    setSelectedNodeId: (id: string | null) => void;
  },
) => {
  const { setContextMenu, setEdges, setNodes, setSelectedNodeId, setPendingEdge } = setters;
  const { edges, nodes } = graph;

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
        setNodes(() => next.nodes);
        setEdges(() => next.edges);
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
  }, [
    edges,
    lockedNodeIds,
    nodes,
    selectedNodeId,
    setContextMenu,
    setEdges,
    setNodes,
    setSelectedNodeId,
    setPendingEdge,
  ]);
};

const useCanvasPointerHandlers = (
  nodeContainerRefs: { current: Map<string, Container> },
  draggingRef: { current: DragState | null },
  setNodes: (fn: (current: PixiNode[]) => PixiNode[]) => void,
  setPendingEdge: (fn: (prev: PendingEdge | null) => PendingEdge | null) => void,
) => {
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { onNodePointerDown, onStagePointerMove, onStagePointerUp };
};

const useCanvasEdgeConnection = (
  refs: {
    draggingRef: { current: DragState | null };
    nodesRef: { current: PixiNode[] };
    pendingEdgeRef: { current: PendingEdge | null };
  },
  setPendingEdge: (p: PendingEdge | null) => void,
  setEdges: (fn: (current: Edge[]) => Edge[]) => void,
) => {
  const { draggingRef, nodesRef, pendingEdgeRef } = refs;
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
    [], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return { onHandleClick };
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

  useCanvasKeyboard({ edges, nodes }, selectedNodeId, lockedNodeIds, {
    setContextMenu,
    setEdges,
    setNodes,
    setPendingEdge,
    setSelectedNodeId,
  });

  const { onNodePointerDown, onStagePointerMove, onStagePointerUp } = useCanvasPointerHandlers(
    nodeContainerRefs,
    draggingRef,
    setNodes,
    setPendingEdge,
  );

  const { onHandleClick } = useCanvasEdgeConnection(
    { draggingRef, nodesRef, pendingEdgeRef },
    setPendingEdge,
    setEdges,
  );

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
      setNodes(() => next.nodes);
      setEdges(() => next.edges);
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

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setPendingEdge(null);
    setContextMenu(null);
  }, []);

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
        <DomMirror
          dropzoneRef={dropzoneRef}
          edges={edges}
          lockedNodeIds={lockedNodeIds}
          nodes={nodes}
          onEdgeClick={onEdgeClick}
          onNodeSelect={onNodeSelect}
          overloadedNodeIds={overloadedNodeIds}
          setContextMenu={setContextMenu}
          setSelectedNodeId={setSelectedNodeId}
        />

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
