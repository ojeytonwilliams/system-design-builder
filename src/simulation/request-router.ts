import type { ArchitectureEdge } from "../domain/canvas-logic.js";
import type { ComponentType } from "../domain/component-library.js";

type RouterResult = { status: "FULFILLED" } | { edgeId: string; status: "IN_TRANSIT" };

interface WeightedOption {
  option: RouterResult;
  weight: number;
}

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

export { getRoutingOptions };
export type { RouterResult, WeightedOption };
