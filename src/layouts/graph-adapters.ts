import { COMPONENT_LIBRARY } from "../components/component-library.js";
import type { ArchitectureEdge, ArchitectureNode } from "../components/game-canvas.js";
import type { GraphEdge, GraphNode } from "../simulation/types.js";

const toGraphNode = (canvasNode: ArchitectureNode): GraphNode => ({
  capacity: COMPONENT_LIBRARY[canvasNode.componentType].capacity,
  id: canvasNode.id,
  type: canvasNode.componentType,
});

const toGraphEdge = (edge: ArchitectureEdge): GraphEdge => ({
  source: edge.source,
  target: edge.target,
});

export { toGraphEdge, toGraphNode };
