import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import type { ComponentType } from "../domain/component-library.js";

interface RouterContext {
  cacheHitRate: number;
  edges: ArchitectureEdge[];
  nodes: ArchitectureNode[];
}

type RouterResult = { status: "FULFILLED" } | { edgeId: string; status: "IN_TRANSIT" };

const getOutgoingEdges = (nodeId: string, edges: ArchitectureEdge[]): ArchitectureEdge[] =>
  edges.filter((e) => e.source === nodeId);

const routeByType = (
  type: ComponentType,
  outgoingEdges: ArchitectureEdge[],
  cacheHitRate: number,
): RouterResult => {
  switch (type) {
    case "db":
    case "db-large":
      return { status: "FULFILLED" };

    case "server":
    case "server-large": {
      const [edge] = outgoingEdges;
      if (edge === undefined) {
        return { status: "FULFILLED" };
      }
      return { edgeId: edge.id, status: "IN_TRANSIT" };
    }

    case "cache": {
      if (Math.random() < cacheHitRate) {
        return { status: "FULFILLED" };
      }
      const [edge] = outgoingEdges;
      if (edge === undefined) {
        return { status: "FULFILLED" };
      }
      return { edgeId: edge.id, status: "IN_TRANSIT" };
    }

    case "load-balancer": {
      const index = Math.floor(Math.random() * outgoingEdges.length);
      const [edge] = outgoingEdges.slice(index);
      if (edge === undefined) {
        return { status: "FULFILLED" };
      }
      return { edgeId: edge.id, status: "IN_TRANSIT" };
    }

    case "users": {
      const [edge] = outgoingEdges;
      if (edge === undefined) {
        return { status: "FULFILLED" };
      }
      return { edgeId: edge.id, status: "IN_TRANSIT" };
    }
  }
};

const requestRouter = (nodeId: string, context: RouterContext): RouterResult => {
  const node = context.nodes.find((n) => n.id === nodeId);
  if (node === undefined) {
    return { status: "FULFILLED" };
  }
  return routeByType(
    node.componentType,
    getOutgoingEdges(nodeId, context.edges),
    context.cacheHitRate,
  );
};

export { requestRouter };
export type { RouterContext, RouterResult };
