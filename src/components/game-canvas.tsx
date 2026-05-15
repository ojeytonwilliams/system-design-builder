import type { DragEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { isComponentType } from "./component-library.js";
import type { ComponentType } from "./component-library.js";
import {
  DEFAULT_DROP_POSITION,
  DEFAULT_LOCKED_NODE_IDS,
  DEFAULT_OVERLOADED_NODE_IDS,
  snapPositionToGrid,
} from "./canvas-logic.js";
import type { ArchitectureNodeData, PixiEdge, PixiNode } from "./canvas-logic.js";
import { CanvasPixiRenderer } from "./canvas-pixi-renderer.js";
import {
  addEdge,
  buildInitialGraph,
  deselectAll,
  moveNode,
  openEdgeContextMenu,
  openNodeContextMenu,
  placeNode,
  removeFromMenu,
  removeSelectedEdge,
  removeSelectedNode,
  selectEdge,
  selectNode,
  setEdgesAnimated,
} from "./canvas-state.js";
import type { CanvasGraph, ContextMenuState } from "./canvas-state.js";

const CANVAS_BACKGROUND = "#f8f5ec";

type ArchitectureCanvasNode = PixiNode;
type Edge = PixiEdge;

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

const relativeTo = (
  clientPos: { clientX: number; clientY: number },
  ref: { current: HTMLDivElement | null },
): { x: number; y: number } => {
  const rect = ref.current?.getBoundingClientRect();
  return { x: clientPos.clientX - (rect?.left ?? 0), y: clientPos.clientY - (rect?.top ?? 0) };
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
  const [graph, setGraph] = useState<CanvasGraph>(() => ({
    ...buildInitialGraph(initialNodes, initialEdges),
    contextMenu: initialContextMenu ?? null,
  }));
  const [stageSize, setStageSize] = useState({ height: 0, width: 0 });
  const dropzoneRef = useRef<HTMLDivElement>(null);

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
    setGraph((g) => setEdgesAnimated(g, isSimulating));
  }, [isSimulating]);

  useEffect(() => {
    onSelectedNodeChange?.(graph.selectedNodeId);
  }, [graph.selectedNodeId, onSelectedNodeChange]);

  useEffect(() => {
    onStateChange?.(graph.nodes, graph.edges);
  }, [graph.nodes, graph.edges, onStateChange]);

  useEffect(() => {
    if (componentToPlace === null || componentToPlace === undefined || isLocked) {
      return;
    }
    setGraph((g) => placeNode(g, componentToPlace, snapPositionToGrid(DEFAULT_DROP_POSITION)));
    onComponentPlaced?.();
  }, [componentToPlace, isLocked, onComponentPlaced]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setGraph((g) => deselectAll(g));
        return;
      }
      if (event.key !== "Delete") {
        return;
      }
      setGraph((g) => {
        if (g.selectedNodeId !== null) {
          return removeSelectedNode(g, lockedNodeIds);
        }
        return removeSelectedEdge(g);
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [lockedNodeIds]);

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
    setGraph((g) => placeNode(g, componentType, position));
  };

  const onNodeSelect = useCallback((nodeId: string) => {
    setGraph((g) => selectNode(g, nodeId));
  }, []);

  const onEdgeSelect = useCallback((edgeId: string) => {
    setGraph((g) => selectEdge(g, edgeId));
  }, []);

  const onNodeContextMenu = useCallback(
    (nodeId: string, clientPos: { clientX: number; clientY: number }) => {
      const pos = relativeTo(clientPos, dropzoneRef);
      setGraph((g) => openNodeContextMenu(g, nodeId, pos, lockedNodeIds));
    },
    [lockedNodeIds],
  );

  const onEdgeContextMenu = useCallback(
    (edgeId: string, clientPos: { clientX: number; clientY: number }) => {
      const pos = relativeTo(clientPos, dropzoneRef);
      setGraph((g) => openEdgeContextMenu(g, edgeId, pos));
    },
    [],
  );

  const onEdgeCreated = useCallback((sourceNodeId: string, targetNodeId: string) => {
    setGraph((g) => addEdge(g, sourceNodeId, targetNodeId));
  }, []);

  const onNodeDragEnd = useCallback((nodeId: string, position: { x: number; y: number }) => {
    setGraph((g) => moveNode(g, nodeId, position));
  }, []);

  const onPaneClick = useCallback(() => {
    setGraph((g) => deselectAll(g));
  }, []);

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
        {stageSize.width > 0 && stageSize.height > 0 && (
          <CanvasPixiRenderer
            edges={graph.edges}
            isLocked={isLocked}
            isSimulating={isSimulating}
            lockedNodeIds={lockedNodeIds}
            nodes={graph.nodes}
            onEdgeContextMenu={onEdgeContextMenu}
            onEdgeCreated={onEdgeCreated}
            onEdgeSelect={onEdgeSelect}
            onNodeContextMenu={onNodeContextMenu}
            onNodeDragEnd={onNodeDragEnd}
            onNodeSelect={onNodeSelect}
            onPaneClick={onPaneClick}
            overloadedNodeIds={overloadedNodeIds}
            resizeTo={dropzoneRef}
            selectedNodeId={graph.selectedNodeId}
            stageHeight={stageSize.height}
            stageWidth={stageSize.width}
          />
        )}
      </div>

      {graph.contextMenu !== null && (
        <div
          style={{
            left: `${graph.contextMenu.x}px`,
            position: "absolute",
            top: `${graph.contextMenu.y}px`,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => {
              setGraph((g) => removeFromMenu(g));
            }}
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

export { GameCanvas };
export type { ArchitectureCanvasNode, ArchitectureNodeData, Edge };
