import { computeRate, MAX_EVENTS, ROLLING_WINDOW_MS } from "../simulation/metrics.js";
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
    const totalWeight = options.reduce((sum, o) => sum + o.weight, 0);

    for (const { option, weight } of options) {
      if (option.status === "IN_TRANSIT") {
        edgeRate.set(option.edgeId, inRate * (weight / totalWeight));
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
 * Predicts the rate that computeRate would report for a node receiving
 * steady-state traffic at the given rate, by constructing synthetic
 * timestamps and feeding them through the same computeRate function
 * used at runtime.
 */
const predictMeasuredRate = (ratePerMs: number): number => {
  if (ratePerMs <= 0) {
    return 0;
  }
  const gap = 1 / ratePerMs;
  const timestamps = Array.from({ length: MAX_EVENTS }, (_, i) => i * gap);
  return computeRate(timestamps, ROLLING_WINDOW_MS);
};

/**
 * Validates that every finite-capacity node in the solution will not
 * register as overloaded in the runtime metrics.
 *
 * Predicts the rate that computeRate would report by feeding synthetic
 * steady-state timestamps through the same function, so the validator
 * stays in sync with the runtime metrics automatically.
 */
const validateLevelSolution = (
  level: Pick<LevelDefinition, "cacheHitRate" | "trafficTarget">,
  solution: LevelSolution,
  componentCapacities: Record<string, { readonly capacity: number }>,
): ValidationResult => {
  const nodeRates = computeNodeRates(solution, level.trafficTarget, level.cacheHitRate);
  const violations: NodeViolation[] = [];

  for (const node of solution.nodes) {
    const incomingRatePerMs = nodeRates.get(node.id) ?? 0;
    const capacity = componentCapacities[node.componentType]?.capacity ?? Infinity;

    if (isFinite(capacity)) {
      const maxMeasuredRatePerMs = predictMeasuredRate(incomingRatePerMs);

      if (maxMeasuredRatePerMs > capacity) {
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
