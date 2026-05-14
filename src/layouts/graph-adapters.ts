import { COMPONENT_LIBRARY } from "../components/component-library.js";
import type { ArchitectureCanvasNode, Edge } from "../components/game-canvas.js";
import type { GraphEdge, GraphNode } from "../simulation/types.js";

const toGraphNode = (canvasNode: ArchitectureCanvasNode): GraphNode => ({
  capacity: COMPONENT_LIBRARY[canvasNode.data.componentType].capacity,
  id: canvasNode.id,
  type: canvasNode.data.componentType,
});

const toGraphEdge = (edge: Edge): GraphEdge => ({
  source: edge.source,
  target: edge.target,
});

export { toGraphEdge, toGraphNode };
