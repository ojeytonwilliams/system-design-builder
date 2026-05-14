import type { ArchitectureCanvasNode, Edge } from "../components/game-canvas.js";
import type { StartingEdge, StartingNode } from "../levels/types.js";

const levelNodeToCanvasNode = (node: StartingNode): ArchitectureCanvasNode => ({
  data: { componentType: node.componentType },
  id: node.id,
  position: node.position,
  type: "architecture",
});

const levelEdgeToCanvasEdge = (startingEdge: StartingEdge): Edge => ({
  animated: false,
  id: startingEdge.id,
  source: startingEdge.source,
  target: startingEdge.target,
  type: "architecture-edge",
});

export { levelEdgeToCanvasEdge, levelNodeToCanvasNode };
