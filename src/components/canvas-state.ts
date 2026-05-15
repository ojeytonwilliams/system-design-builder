import {
  createNodeData,
  getNextNodeId,
  isConnectionValid,
  removeNodeAndConnections,
} from "./canvas-logic.js";
import type { PixiEdge, PixiNode } from "./canvas-logic.js";
import type { ComponentType } from "./component-library.js";

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

interface CanvasGraph {
  contextMenu: ContextMenuState | null;
  edges: PixiEdge[];
  nodes: PixiNode[];
  selectedNodeId: string | null;
}

const placeNode = (
  graph: CanvasGraph,
  componentType: ComponentType,
  position: { x: number; y: number },
): CanvasGraph => {
  const node: PixiNode = {
    data: createNodeData(componentType),
    id: getNextNodeId(componentType, graph.nodes),
    position,
    type: "architecture",
  };
  return { ...graph, contextMenu: null, nodes: [...graph.nodes, node], selectedNodeId: null };
};

const selectNode = (graph: CanvasGraph, nodeId: string): CanvasGraph => ({
  ...graph,
  contextMenu: null,
  edges: graph.edges.map((e) => ({ ...e, selected: false })),
  selectedNodeId: nodeId,
});

const selectEdge = (graph: CanvasGraph, edgeId: string): CanvasGraph => ({
  ...graph,
  contextMenu: null,
  edges: graph.edges.map((e) => ({ ...e, selected: e.id === edgeId })),
  selectedNodeId: null,
});

const deselectAll = (graph: CanvasGraph): CanvasGraph => ({
  ...graph,
  contextMenu: null,
  selectedNodeId: null,
});

const moveNode = (
  graph: CanvasGraph,
  nodeId: string,
  position: { x: number; y: number },
): CanvasGraph => ({
  ...graph,
  nodes: graph.nodes.map((n) => (n.id === nodeId ? { ...n, position } : n)),
});

const removeSelectedNode = (graph: CanvasGraph, lockedNodeIds: string[]): CanvasGraph => {
  if (graph.selectedNodeId === null || lockedNodeIds.includes(graph.selectedNodeId)) {
    return graph;
  }
  const next = removeNodeAndConnections(graph.selectedNodeId, graph.nodes, graph.edges);
  return {
    ...graph,
    contextMenu: null,
    edges: next.edges,
    nodes: next.nodes,
    selectedNodeId: null,
  };
};

const removeSelectedEdge = (graph: CanvasGraph): CanvasGraph => {
  const selectedEdge = graph.edges.find((e) => e.selected === true);
  if (selectedEdge === undefined) {
    return graph;
  }
  return {
    ...graph,
    contextMenu: null,
    edges: graph.edges.filter((e) => e.id !== selectedEdge.id),
  };
};

const addEdge = (graph: CanvasGraph, sourceNodeId: string, targetNodeId: string): CanvasGraph => {
  const sourceNode = graph.nodes.find((n) => n.id === sourceNodeId);
  const targetNode = graph.nodes.find((n) => n.id === targetNodeId);
  if (sourceNode === undefined || targetNode === undefined) {
    return graph;
  }
  if (!isConnectionValid(sourceNode.data.componentType, targetNode.data.componentType)) {
    return graph;
  }
  const edge: PixiEdge = {
    animated: false,
    id: `edge-${sourceNodeId}-${targetNodeId}-${Date.now()}`,
    source: sourceNodeId,
    target: targetNodeId,
  };
  return { ...graph, edges: [...graph.edges, edge] };
};

const openNodeContextMenu = (
  graph: CanvasGraph,
  nodeId: string,
  pos: { x: number; y: number },
  lockedNodeIds: string[],
): CanvasGraph => {
  if (lockedNodeIds.includes(nodeId)) {
    return graph;
  }
  return {
    ...graph,
    contextMenu: { kind: "node", nodeId, x: pos.x, y: pos.y },
    selectedNodeId: nodeId,
  };
};

const openEdgeContextMenu = (
  graph: CanvasGraph,
  edgeId: string,
  pos: { x: number; y: number },
): CanvasGraph => ({
  ...graph,
  contextMenu: { edgeId, kind: "edge", x: pos.x, y: pos.y },
  selectedNodeId: null,
});

const removeFromMenu = (graph: CanvasGraph): CanvasGraph => {
  if (graph.contextMenu === null) {
    return graph;
  }
  if (graph.contextMenu.kind === "node") {
    const { nodeId } = graph.contextMenu;
    const next = removeNodeAndConnections(nodeId, graph.nodes, graph.edges);
    return {
      ...graph,
      contextMenu: null,
      edges: next.edges,
      nodes: next.nodes,
      selectedNodeId: null,
    };
  }
  const { edgeId } = graph.contextMenu;
  return { ...graph, contextMenu: null, edges: graph.edges.filter((e) => e.id !== edgeId) };
};

export {
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
};
export type { CanvasGraph, ContextMenuState };
