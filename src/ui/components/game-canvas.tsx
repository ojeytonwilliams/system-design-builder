import type { Dispatch, DragEvent } from "react";
import { useEffect, useReducer, useRef, useState } from "react";
import type { Processing, Transit } from "../../simulation/request-types.js";
import {
  DEFAULT_DROP_POSITION,
  DEFAULT_LOCKED_NODE_IDS,
  DEFAULT_OVERLOADED_NODE_IDS,
  snapPositionToGrid,
} from "../../domain/canvas-logic.js";
import type { ArchitectureEdge, ArchitectureNode } from "../../domain/canvas-logic.js";
import { CanvasPixiRenderer } from "./canvas-pixi-renderer.js";
import { isComponentType } from "../../domain/component-library.js";
import type { ComponentType } from "../../domain/component-library.js";
import { canvasUIReducer } from "../../game/canvas-ui-reducer.js";
import type { ContextMenuState } from "../../game/canvas-ui-reducer.js";
import type { GraphAction } from "../../game/graph-reducer.js";

const CANVAS_BACKGROUND = "#f8f5ec";

interface GameCanvasProps {
  componentToPlace?: ComponentType | null;
  dispatchGraph: Dispatch<GraphAction>;
  edges: ArchitectureEdge[];
  initialContextMenu?: ContextMenuState;
  initialSelectedEdgeId?: string | null;
  isLocked?: boolean;
  isSimulating?: boolean;
  lockedNodeIds?: string[];
  nodes: ArchitectureNode[];
  onComponentPlaced?: () => void;
  onEdgeCreated: (sourceId: string, targetId: string) => void;
  onNodePlaced: (componentType: ComponentType) => void;
  onSelectedNodeChange: (nodeId: string | null) => void;
  overloadedNodeIds?: string[];
  processing: Map<string, Processing>;
  selectedNodeId: string | null;
  transits: Map<string, Transit>;
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
  dispatchGraph,
  edges,
  initialContextMenu,
  initialSelectedEdgeId,
  isLocked = false,
  isSimulating = false,
  lockedNodeIds = DEFAULT_LOCKED_NODE_IDS,
  nodes,
  onComponentPlaced,
  onEdgeCreated,
  onNodePlaced,
  onSelectedNodeChange,
  overloadedNodeIds = DEFAULT_OVERLOADED_NODE_IDS,
  processing,
  selectedNodeId,
  transits,
}: GameCanvasProps) => {
  const [canvasUI, dispatchCanvas] = useReducer(canvasUIReducer, {
    contextMenu: initialContextMenu ?? null,
    selectedEdgeId: initialSelectedEdgeId ?? null,
  });
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
    dispatchGraph({
      componentType: componentToPlace,
      position: snapPositionToGrid(DEFAULT_DROP_POSITION),
      type: "PLACE_NODE",
    });
    dispatchCanvas({ type: "DESELECT_ALL" });
    onNodePlaced(componentToPlace);
    onSelectedNodeChange(null);
    onComponentPlaced?.();
  }, [
    componentToPlace,
    dispatchGraph,
    isLocked,
    onComponentPlaced,
    onNodePlaced,
    onSelectedNodeChange,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dispatchCanvas({ type: "DESELECT_ALL" });
        onSelectedNodeChange(null);
        return;
      }
      if (event.key !== "Delete") {
        return;
      }
      if (selectedNodeId !== null) {
        if (!lockedNodeIds.includes(selectedNodeId)) {
          dispatchGraph({ nodeId: selectedNodeId, type: "REMOVE_NODE" });
          dispatchCanvas({ type: "DESELECT_ALL" });
          onSelectedNodeChange(null);
        }
      } else if (canvasUI.selectedEdgeId !== null) {
        dispatchGraph({ edgeId: canvasUI.selectedEdgeId, type: "REMOVE_EDGE" });
        dispatchCanvas({ type: "DESELECT_ALL" });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [canvasUI.selectedEdgeId, dispatchGraph, lockedNodeIds, onSelectedNodeChange, selectedNodeId]);

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
    dispatchGraph({ componentType, position, type: "PLACE_NODE" });
    dispatchCanvas({ type: "DESELECT_ALL" });
    onNodePlaced(componentType);
    onSelectedNodeChange(null);
  };

  const onNodeSelect = (nodeId: string) => {
    onSelectedNodeChange(nodeId);
    dispatchCanvas({ type: "SELECT_NODE" });
  };

  const onEdgeSelect = (edgeId: string) => {
    dispatchCanvas({ edgeId, type: "SELECT_EDGE" });
    onSelectedNodeChange(null);
  };

  const onNodeContextMenu = (nodeId: string, clientPos: { clientX: number; clientY: number }) => {
    if (lockedNodeIds.includes(nodeId)) {
      return;
    }
    const pos = relativeTo(clientPos, dropzoneRef);
    dispatchCanvas({ nodeId, type: "OPEN_NODE_CONTEXT_MENU", x: pos.x, y: pos.y });
    onSelectedNodeChange(nodeId);
  };

  const onEdgeContextMenu = (edgeId: string, clientPos: { clientX: number; clientY: number }) => {
    const pos = relativeTo(clientPos, dropzoneRef);
    dispatchCanvas({ edgeId, type: "OPEN_EDGE_CONTEXT_MENU", x: pos.x, y: pos.y });
    onSelectedNodeChange(null);
  };

  const handleEdgeCreated = (sourceNodeId: string, targetNodeId: string) => {
    dispatchGraph({ sourceId: sourceNodeId, targetId: targetNodeId, type: "ADD_EDGE" });
    onEdgeCreated(sourceNodeId, targetNodeId);
  };

  const onNodeDragEnd = (nodeId: string, position: { x: number; y: number }) => {
    dispatchGraph({ nodeId, position, type: "MOVE_NODE" });
  };

  const onPaneClick = () => {
    dispatchCanvas({ type: "DESELECT_ALL" });
    onSelectedNodeChange(null);
  };

  const edgesWithSelection = edges.map((e) => ({
    ...e,
    selected: e.id === canvasUI.selectedEdgeId,
  }));

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
            edges={edgesWithSelection}
            isLocked={isLocked}
            isSimulating={isSimulating}
            lockedNodeIds={lockedNodeIds}
            nodes={nodes}
            onEdgeContextMenu={onEdgeContextMenu}
            onEdgeCreated={handleEdgeCreated}
            onEdgeSelect={onEdgeSelect}
            onNodeContextMenu={onNodeContextMenu}
            onNodeDragEnd={onNodeDragEnd}
            onNodeSelect={onNodeSelect}
            onPaneClick={onPaneClick}
            overloadedNodeIds={overloadedNodeIds}
            processing={processing}
            resizeTo={dropzoneRef}
            selectedNodeId={selectedNodeId}
            stageHeight={stageSize.height}
            stageWidth={stageSize.width}
            transits={transits}
          />
        )}
      </div>

      {canvasUI.contextMenu !== null && (
        <div
          style={{
            left: `${canvasUI.contextMenu.x}px`,
            position: "absolute",
            top: `${canvasUI.contextMenu.y}px`,
            zIndex: 10,
          }}
        >
          <button
            onClick={() => {
              if (canvasUI.contextMenu === null) {
                return;
              }
              if (canvasUI.contextMenu.kind === "node") {
                dispatchGraph({ nodeId: canvasUI.contextMenu.nodeId, type: "REMOVE_NODE" });
                onSelectedNodeChange(null);
              } else {
                dispatchGraph({ edgeId: canvasUI.contextMenu.edgeId, type: "REMOVE_EDGE" });
              }
              dispatchCanvas({ type: "CLOSE_CONTEXT_MENU" });
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
export type { ArchitectureEdge, ArchitectureNode };
