import {
  getNextNodeId,
  isConnectionValid,
  removeNodeAndConnections,
} from "../domain/canvas-logic.js";
import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import type { ComponentType } from "../domain/component-library.js";

interface GraphState {
  edges: ArchitectureEdge[];
  nodes: ArchitectureNode[];
}

type GraphAction =
  | { edgeId: string; type: "REMOVE_EDGE" }
  | { edges: ArchitectureEdge[]; nodes: ArchitectureNode[]; type: "LOAD_LEVEL" }
  | { nodeId: string; position: { x: number; y: number }; type: "MOVE_NODE" }
  | { nodeId: string; type: "REMOVE_NODE" }
  | { componentType: ComponentType; position: { x: number; y: number }; type: "PLACE_NODE" }
  | { sourceId: string; targetId: string; type: "ADD_EDGE" };

const graphReducer = (state: GraphState, action: GraphAction): GraphState => {
  switch (action.type) {
    case "ADD_EDGE": {
      const sourceNode = state.nodes.find((n) => n.id === action.sourceId);
      const targetNode = state.nodes.find((n) => n.id === action.targetId);
      if (sourceNode === undefined || targetNode === undefined) {
        return state;
      }
      if (!isConnectionValid(sourceNode.componentType, targetNode.componentType)) {
        return state;
      }
      const edge: ArchitectureEdge = {
        id: `edge-${action.sourceId}-${action.targetId}-${Date.now()}`,
        source: action.sourceId,
        target: action.targetId,
      };
      return { ...state, edges: [...state.edges, edge] };
    }
    case "PLACE_NODE": {
      const node: ArchitectureNode = {
        componentType: action.componentType,
        id: getNextNodeId(action.componentType, state.nodes),
        position: action.position,
      };
      return { ...state, nodes: [...state.nodes, node] };
    }
    case "MOVE_NODE":
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, position: action.position } : n,
        ),
      };
    case "REMOVE_NODE": {
      const next = removeNodeAndConnections(action.nodeId, state.nodes, state.edges);
      return { ...state, edges: next.edges, nodes: next.nodes };
    }
    case "REMOVE_EDGE":
      return { ...state, edges: state.edges.filter((e) => e.id !== action.edgeId) };
    case "LOAD_LEVEL":
      return { edges: action.edges, nodes: action.nodes };
  }
};

export type { GraphAction, GraphState };
export { graphReducer };
