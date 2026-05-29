import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";

interface LinearTrafficRateParams {
  elapsed: number;
  timeout: number;
  trafficPeak: number;
  trafficStart: number;
}

const getLinearTrafficRate = ({
  elapsed,
  timeout,
  trafficPeak,
  trafficStart,
}: LinearTrafficRateParams): number => {
  if (timeout <= 0) {
    return trafficPeak;
  }

  const progress = Math.min(elapsed / timeout, 1);

  return trafficStart + (trafficPeak - trafficStart) * progress;
};

const hasRunnablePath = (nodes: ArchitectureNode[], edges: ArchitectureEdge[]): boolean => {
  const usersNodeIds = new Set(nodes.filter((n) => n.componentType === "users").map((n) => n.id));

  return edges.some((e) => usersNodeIds.has(e.source));
};

export { getLinearTrafficRate, hasRunnablePath };
