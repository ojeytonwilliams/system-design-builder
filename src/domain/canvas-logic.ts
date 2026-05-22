import type { ComponentType } from "./component-library.js";

type HandleSide = "bottom" | "left" | "right" | "top";

interface ArchitectureNode {
  componentType: ComponentType;
  id: string;
  position: { x: number; y: number };
}

interface ArchitectureEdge {
  id: string;
  selected?: boolean;
  source: string;
  target: string;
}

const GRID_SIZE = 24;
const NODE_WIDTH = 88;
const NODE_MIN_HEIGHT = 96;

const DEFAULT_DROP_POSITION = { x: 160, y: 160 };
const DEFAULT_OVERLOADED_NODE_IDS: string[] = [];
const DEFAULT_LOCKED_NODE_IDS: string[] = [];

const snapPositionToGrid = ({ x, y }: { x: number; y: number }): { x: number; y: number } => ({
  x: Math.round(x / GRID_SIZE) * GRID_SIZE,
  y: Math.round(y / GRID_SIZE) * GRID_SIZE,
});

const isConnectionValid = (_sourceType: ComponentType, targetType: ComponentType): boolean =>
  targetType !== "users";

const getNextNodeId = (componentType: ComponentType, nodes: ArchitectureNode[]): string => {
  const usedIds = new Set(nodes.map((n) => n.id));
  let i = 1;
  while (usedIds.has(`${componentType}-${i}`)) {
    i++;
  }
  return `${componentType}-${i}`;
};

const removeNodeAndConnections = (
  nodeId: string,
  nodes: ArchitectureNode[],
  edges: ArchitectureEdge[],
) => ({
  edges: edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
  nodes: nodes.filter((n) => n.id !== nodeId),
});

const getHandlePosition = (
  node: { position: { x: number; y: number } },
  side: HandleSide,
): { x: number; y: number } => {
  const { x, y } = node.position;
  switch (side) {
    case "right":
      return { x: x + NODE_WIDTH, y: y + NODE_MIN_HEIGHT / 2 };
    case "bottom":
      return { x: x + NODE_WIDTH / 2, y: y + NODE_MIN_HEIGHT };
    case "left":
      return { x, y: y + NODE_MIN_HEIGHT / 2 };
    case "top":
      return { x: x + NODE_WIDTH / 2, y };
  }
};

const chooseBestHandles = (
  source: { position: { x: number; y: number } },
  target: { position: { x: number; y: number } },
): { sourceHandle: HandleSide; targetHandle: HandleSide } => {
  const dx = target.position.x - source.position.x;
  const dy = target.position.y - source.position.y;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { sourceHandle: "right", targetHandle: "left" }
      : { sourceHandle: "left", targetHandle: "right" };
  }
  return dy >= 0
    ? { sourceHandle: "bottom", targetHandle: "top" }
    : { sourceHandle: "top", targetHandle: "bottom" };
};

export {
  chooseBestHandles,
  DEFAULT_DROP_POSITION,
  DEFAULT_LOCKED_NODE_IDS,
  DEFAULT_OVERLOADED_NODE_IDS,
  getHandlePosition,
  getNextNodeId,
  isConnectionValid,
  NODE_MIN_HEIGHT,
  NODE_WIDTH,
  removeNodeAndConnections,
  snapPositionToGrid,
};
export type { ArchitectureEdge, ArchitectureNode, HandleSide };
