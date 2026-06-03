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
      return outgoingEdges.map((e) => ({
        option: { edgeId: e.id, status: "IN_TRANSIT" as const },
        weight: 1,
      }));
    }

    case "cache": {
      const [edge] = outgoingEdges;
      if (edge === undefined) {
        return [{ option: { status: "FULFILLED" }, weight: 1 }];
      }
      const hitWeight = cacheHitRate * 10;
      if (!Number.isInteger(hitWeight) || hitWeight < 0 || hitWeight > 10) {
        throw Error(
          `cacheHitRate must be between 0 and 1 with at most one decimal place, got: ${cacheHitRate}`,
        );
      }
      const missWeight = 10 - hitWeight;
      const options: WeightedOption[] = [];
      if (hitWeight > 0) {
        options.push({ option: { status: "FULFILLED" }, weight: hitWeight });
      }
      if (missWeight > 0) {
        options.push({ option: { edgeId: edge.id, status: "IN_TRANSIT" }, weight: missWeight });
      }
      return options.length > 0 ? options : [{ option: { status: "FULFILLED" }, weight: 1 }];
    }
  }
};

export { getRoutingOptions };
export type { RouterResult, WeightedOption };
