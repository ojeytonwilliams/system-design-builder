import type { DragEvent } from "react";
import { useEffect, useRef, useState } from "react";
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
} from "./canvas-state.js";
import type { CanvasGraph, ContextMenuState } from "./canvas-state.js";

const CANVAS_BACKGROUND = "#f8f5ec";

type ArchitectureCanvasNode = PixiNode;
type Edge = PixiEdge;

interface GameCanvasProps {
  componentToPlace?: ComponentType | null;
  edges: Edge[];
  initialContextMenu?: ContextMenuState;
  isLocked?: boolean;
  isSimulating?: boolean;
  lockedNodeIds?: string[];
  nodes: ArchitectureCanvasNode[];
  onComponentPlaced?: () => void;
  onSelectedNodeChange: (nodeId: string | null) => void;
  onStateChange: (nodes: ArchitectureCanvasNode[], edges: Edge[]) => void;
  overloadedNodeIds?: string[];
  selectedNodeId: string | null;
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
  edges,
  initialContextMenu,
  isLocked = false,
  isSimulating = false,
  lockedNodeIds = DEFAULT_LOCKED_NODE_IDS,
  nodes,
  onComponentPlaced,
  onSelectedNodeChange,
  onStateChange,
  overloadedNodeIds = DEFAULT_OVERLOADED_NODE_IDS,
  selectedNodeId,
}: GameCanvasProps) => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(
    initialContextMenu ?? null,
  );
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
    if (componentToPlace === null || componentToPlace === undefined || isLocked) {
      return;
    }
    const current: CanvasGraph = { contextMenu, edges, nodes, selectedNodeId };
    const next = placeNode(current, componentToPlace, snapPositionToGrid(DEFAULT_DROP_POSITION));
    onStateChange(next.nodes, next.edges);
    onSelectedNodeChange(next.selectedNodeId);
    setContextMenu(next.contextMenu);
    onComponentPlaced?.();
  }, [componentToPlace, isLocked, onComponentPlaced, onSelectedNodeChange, onStateChange]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onSelectedNodeChange(null);
        setContextMenu(null);
        return;
      }
      if (event.key !== "Delete") {
        return;
      }
      const current: CanvasGraph = { contextMenu, edges, nodes, selectedNodeId };
      if (current.selectedNodeId === null) {
        const next = removeSelectedEdge(current);
        if (next !== current) {
          onStateChange(next.nodes, next.edges);
        }
      } else {
        const next = removeSelectedNode(current, lockedNodeIds);
        if (next !== current) {
          onStateChange(next.nodes, next.edges);
          onSelectedNodeChange(next.selectedNodeId);
          setContextMenu(next.contextMenu);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [
    contextMenu,
    edges,
    lockedNodeIds,
    nodes,
    onSelectedNodeChange,
    onStateChange,
    selectedNodeId,
  ]);

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
    const current: CanvasGraph = { contextMenu, edges, nodes, selectedNodeId };
    const next = placeNode(current, componentType, position);
    onStateChange(next.nodes, next.edges);
    onSelectedNodeChange(next.selectedNodeId);
    setContextMenu(next.contextMenu);
  };

  const onNodeSelect = (nodeId: string) => {
    const current: CanvasGraph = { contextMenu, edges, nodes, selectedNodeId };
    const next = selectNode(current, nodeId);
    onSelectedNodeChange(next.selectedNodeId);
    setContextMenu(next.contextMenu);
  };

  const onEdgeSelect = (edgeId: string) => {
    const current: CanvasGraph = { contextMenu, edges, nodes, selectedNodeId };
    const next = selectEdge(current, edgeId);
    onStateChange(next.nodes, next.edges);
    onSelectedNodeChange(next.selectedNodeId);
    setContextMenu(next.contextMenu);
  };

  const onNodeContextMenu = (nodeId: string, clientPos: { clientX: number; clientY: number }) => {
    const pos = relativeTo(clientPos, dropzoneRef);
    const current: CanvasGraph = { contextMenu, edges, nodes, selectedNodeId };
    const next = openNodeContextMenu(current, nodeId, pos, lockedNodeIds);
    onSelectedNodeChange(next.selectedNodeId);
    setContextMenu(next.contextMenu);
  };

  const onEdgeContextMenu = (edgeId: string, clientPos: { clientX: number; clientY: number }) => {
    const pos = relativeTo(clientPos, dropzoneRef);
    const current: CanvasGraph = { contextMenu, edges, nodes, selectedNodeId };
    const next = openEdgeContextMenu(current, edgeId, pos);
    onSelectedNodeChange(next.selectedNodeId);
    setContextMenu(next.contextMenu);
  };

  const onEdgeCreated = (sourceNodeId: string, targetNodeId: string) => {
    const current: CanvasGraph = { contextMenu, edges, nodes, selectedNodeId };
    const next = addEdge(current, sourceNodeId, targetNodeId);
    onStateChange(next.nodes, next.edges);
  };

  const onNodeDragEnd = (nodeId: string, position: { x: number; y: number }) => {
    const current: CanvasGraph = { contextMenu, edges, nodes, selectedNodeId };
    const next = moveNode(current, nodeId, position);
    onStateChange(next.nodes, next.edges);
  };

  const onPaneClick = () => {
    const current: CanvasGraph = { contextMenu, edges, nodes, selectedNodeId };
    const next = deselectAll(current);
    onSelectedNodeChange(next.selectedNodeId);
    setContextMenu(next.contextMenu);
  };

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
            edges={edges}
            isLocked={isLocked}
            isSimulating={isSimulating}
            lockedNodeIds={lockedNodeIds}
            nodes={nodes}
            onEdgeContextMenu={onEdgeContextMenu}
            onEdgeCreated={onEdgeCreated}
            onEdgeSelect={onEdgeSelect}
            onNodeContextMenu={onNodeContextMenu}
            onNodeDragEnd={onNodeDragEnd}
            onNodeSelect={onNodeSelect}
            onPaneClick={onPaneClick}
            overloadedNodeIds={overloadedNodeIds}
            resizeTo={dropzoneRef}
            selectedNodeId={selectedNodeId}
            stageHeight={stageSize.height}
            stageWidth={stageSize.width}
          />
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
            onClick={() => {
              const current: CanvasGraph = { contextMenu, edges, nodes, selectedNodeId };
              const next = removeFromMenu(current);
              onStateChange(next.nodes, next.edges);
              onSelectedNodeChange(next.selectedNodeId);
              setContextMenu(next.contextMenu);
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
