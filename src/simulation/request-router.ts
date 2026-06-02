import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import type { ComponentType } from "../domain/component-library.js";

interface RouterContext {
  cacheHitRate: number;
  edges: ArchitectureEdge[];
  nodes: ArchitectureNode[];
}

type RouterResult = { status: "FULFILLED" } | { edgeId: string; status: "IN_TRANSIT" };

interface WeightedOption {
  option: RouterResult;
  weight: number;
}

const getOutgoingEdges = (nodeId: string, edges: ArchitectureEdge[]): ArchitectureEdge[] =>
  edges.filter((e) => e.source === nodeId);

/**
 * Returns all possible routing outcomes for a node, each paired with its
 * probability weight. This is the single source of truth for routing logic —
 * both the stochastic simulation (via selectRoute) and the deterministic
 * validator derive from this function.
 */
const getRoutingOptions = (
  type: ComponentType,
  outgoingEdges: ArchitectureEdge[],
  cacheHitRate: number,
): WeightedOption[] => {
  switch (type) {
    case "db":
    case "db-large":
      return [{ option: { status: "FULFILLED" }, weight: 1 }];

    case "server":
    case "server-large":
    case "users": {
      const [edge] = outgoingEdges;
      if (edge === undefined) {
        return [{ option: { status: "FULFILLED" }, weight: 1 }];
      }
      return [{ option: { edgeId: edge.id, status: "IN_TRANSIT" }, weight: 1 }];
    }

    case "load-balancer": {
      if (outgoingEdges.length === 0) {
        return [{ option: { status: "FULFILLED" }, weight: 1 }];
      }
      const weight = 1 / outgoingEdges.length;
      return outgoingEdges.map((e) => ({
        option: { edgeId: e.id, status: "IN_TRANSIT" as const },
        weight,
      }));
    }

    case "cache": {
      const [edge] = outgoingEdges;
      if (edge === undefined) {
        return [{ option: { status: "FULFILLED" }, weight: 1 }];
      }
      return [
        { option: { status: "FULFILLED" }, weight: cacheHitRate },
        { option: { edgeId: edge.id, status: "IN_TRANSIT" }, weight: 1 - cacheHitRate },
      ];
    }
  }
};

const selectRoute = (options: WeightedOption[], random: () => number): RouterResult => {
  const r = random();
  let cumulative = 0;
  for (const { option, weight } of options) {
    cumulative += weight;
    if (r < cumulative) {
      return option;
    }
  }
  return options.at(-1)?.option ?? { status: "FULFILLED" };
};

const requestRouter = (
  nodeId: string,
  context: RouterContext,
  random: () => number = Math.random,
): RouterResult => {
  const node = context.nodes.find((n) => n.id === nodeId);
  if (node === undefined) {
    return { status: "FULFILLED" };
  }
  const options = getRoutingOptions(
    node.componentType,
    getOutgoingEdges(nodeId, context.edges),
    context.cacheHitRate,
  );
  return selectRoute(options, random);
};

export { getRoutingOptions, requestRouter };
export type { RouterContext, RouterResult, WeightedOption };
