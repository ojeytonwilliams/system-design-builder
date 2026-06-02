import { ROLLING_WINDOW_MS } from "../simulation/metrics.js";
import { getRoutingOptions } from "../simulation/request-router.js";
import type { ArchitectureEdge } from "../domain/canvas-logic.js";
import type { LevelDefinition, LevelSolution } from "./types.js";

interface NodeViolation {
  capacityPerMs: number;
  componentType: string;
  incomingRatePerMs: number;
  maxMeasuredRatePerMs: number;
  nodeId: string;
}

interface ValidationResult {
  valid: boolean;
  violations: NodeViolation[];
}

/**
 * Computes the steady-state incoming rate at each node by propagating
 * trafficRatePerMs forward through the graph topology, using the same
 * routing rules as requestRouter (via getRoutingOptions).
 */
const computeNodeRates = (
  solution: LevelSolution,
  trafficRatePerMs: number,
  cacheHitRate: number,
): Map<string, number> => {
  const nodeById = new Map(solution.nodes.map((n) => [n.id, n]));

  const outEdges = new Map<string, ArchitectureEdge[]>(solution.nodes.map((n) => [n.id, []]));
  const inDegree = new Map<string, number>(solution.nodes.map((n) => [n.id, 0]));

  for (const edge of solution.edges) {
    outEdges.get(edge.source)?.push(edge);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const edgeRate = new Map<string, number>();

  // Kahn's topological ordering: start from nodes with no incoming edges
  const queue: string[] = [];
  for (const [nodeId, deg] of inDegree) {
    if (deg === 0) {
      queue.push(nodeId);
    }
  }

  const nodeRates = new Map<string, number>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeById.get(nodeId)!;

    const inRate =
      node.componentType === "users"
        ? trafficRatePerMs
        : solution.edges
            .filter((e) => e.target === nodeId)
            .reduce((sum, e) => sum + (edgeRate.get(e.id) ?? 0), 0);

    nodeRates.set(nodeId, inRate);

    const edges = outEdges.get(nodeId) ?? [];
    const options = getRoutingOptions(node.componentType, edges, cacheHitRate);

    for (const { option, weight } of options) {
      if (option.status === "IN_TRANSIT") {
        edgeRate.set(option.edgeId, inRate * weight);
      }
    }

    for (const edge of edges) {
      const newDeg = (inDegree.get(edge.target) ?? 0) - 1;
      inDegree.set(edge.target, newDeg);
      if (newDeg === 0) {
        queue.push(edge.target);
      }
    }
  }

  return nodeRates;
};

/**
 * Computes the worst-case maximum integer arrival count for each node within
 * any ROLLING_WINDOW_MS window, using the WRR upper bound per edge:
 *   maxArrivals(edge) = ceil(M_source × weight)
 *
 * When convergent paths originate from the same source (diamond topologies),
 * the sum across incoming edges is capped at M_users so that sibling paths
 * correlated through a shared parent cannot independently each contribute
 * their individual worst case simultaneously.
 */
const computeNodeMaxArrivals = (
  solution: LevelSolution,
  trafficRatePerMs: number,
  cacheHitRate: number,
): Map<string, number> => {
  const nodeById = new Map(solution.nodes.map((n) => [n.id, n]));

  const outEdges = new Map<string, ArchitectureEdge[]>(solution.nodes.map((n) => [n.id, []]));
  const inDegree = new Map<string, number>(solution.nodes.map((n) => [n.id, 0]));

  for (const edge of solution.edges) {
    outEdges.get(edge.source)?.push(edge);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const edgeMaxArrivals = new Map<string, number>();

  const queue: string[] = [];
  for (const [nodeId, deg] of inDegree) {
    if (deg === 0) {
      queue.push(nodeId);
    }
  }

  const mUsers = Math.floor(ROLLING_WINDOW_MS * trafficRatePerMs) + 1;
  const nodeMaxArrivals = new Map<string, number>();

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeById.get(nodeId)!;

    const maxArrivals =
      node.componentType === "users"
        ? mUsers
        : Math.min(
            mUsers,
            solution.edges
              .filter((e) => e.target === nodeId)
              .reduce((sum, e) => sum + (edgeMaxArrivals.get(e.id) ?? 0), 0),
          );

    nodeMaxArrivals.set(nodeId, maxArrivals);

    const edges = outEdges.get(nodeId) ?? [];
    const options = getRoutingOptions(node.componentType, edges, cacheHitRate);

    for (const { option, weight } of options) {
      if (option.status === "IN_TRANSIT") {
        edgeMaxArrivals.set(option.edgeId, Math.ceil(maxArrivals * weight));
      }
    }

    for (const edge of edges) {
      const newDeg = (inDegree.get(edge.target) ?? 0) - 1;
      inDegree.set(edge.target, newDeg);
      if (newDeg === 0) {
        queue.push(edge.target);
      }
    }
  }

  return nodeMaxArrivals;
};

/**
 * Validates that every finite-capacity node in the solution will never
 * register as overloaded in the rolling-window metrics.
 *
 * Uses integer WRR arrival bounds (via computeNodeMaxArrivals) rather than
 * floating-point rates, so that diamond topologies with independent routers
 * feeding a shared downstream node are handled correctly.
 */
const validateLevelSolution = (
  level: Pick<LevelDefinition, "cacheHitRate" | "trafficTarget">,
  solution: LevelSolution,
  componentCapacities: Record<string, { readonly capacity: number }>,
): ValidationResult => {
  const nodeRates = computeNodeRates(solution, level.trafficTarget, level.cacheHitRate);
  const nodeMaxArrivals = computeNodeMaxArrivals(solution, level.trafficTarget, level.cacheHitRate);
  const violations: NodeViolation[] = [];

  for (const node of solution.nodes) {
    const incomingRatePerMs = nodeRates.get(node.id) ?? 0;
    const capacity = componentCapacities[node.componentType]?.capacity ?? Infinity;

    if (isFinite(capacity)) {
      const maxArrivals = nodeMaxArrivals.get(node.id) ?? 0;
      const maxMeasuredRatePerMs = maxArrivals / ROLLING_WINDOW_MS;

      if (maxMeasuredRatePerMs >= capacity) {
        violations.push({
          capacityPerMs: capacity,
          componentType: node.componentType,
          incomingRatePerMs,
          maxMeasuredRatePerMs,
          nodeId: node.id,
        });
      }
    }
  }

  return { valid: violations.length === 0, violations };
};

export { validateLevelSolution };
export type { NodeViolation, ValidationResult };
