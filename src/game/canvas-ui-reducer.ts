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

interface CanvasUIState {
  contextMenu: ContextMenuState | null;
  selectedEdgeId: string | null;
}

type CanvasUIAction =
  | { edgeId: string; type: "OPEN_EDGE_CONTEXT_MENU"; x: number; y: number }
  | { edgeId: string; type: "SELECT_EDGE" }
  | { nodeId: string; type: "OPEN_NODE_CONTEXT_MENU"; x: number; y: number }
  | { type: "CLOSE_CONTEXT_MENU" }
  | { type: "DESELECT_ALL" }
  | { type: "SELECT_NODE" };

const canvasUIReducer = (state: CanvasUIState, action: CanvasUIAction): CanvasUIState => {
  switch (action.type) {
    case "SELECT_NODE":
      return { contextMenu: null, selectedEdgeId: null };
    case "SELECT_EDGE":
      return { contextMenu: null, selectedEdgeId: action.edgeId };
    case "DESELECT_ALL":
      return { contextMenu: null, selectedEdgeId: null };
    case "OPEN_NODE_CONTEXT_MENU":
      return {
        contextMenu: { kind: "node", nodeId: action.nodeId, x: action.x, y: action.y },
        selectedEdgeId: null,
      };
    case "OPEN_EDGE_CONTEXT_MENU":
      return {
        contextMenu: { edgeId: action.edgeId, kind: "edge", x: action.x, y: action.y },
        selectedEdgeId: null,
      };
    case "CLOSE_CONTEXT_MENU":
      return { ...state, contextMenu: null };
  }
};

export type { CanvasUIAction, CanvasUIState, ContextMenuState };
export { canvasUIReducer };
