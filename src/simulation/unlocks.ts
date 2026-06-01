import type { ComponentType } from "../domain/component-library.js";
import type { ArchitectureNode } from "../domain/canvas-logic.js";
import type { ComponentUnlock, UnlockTrigger } from "../levels/types.js";
import type { NodeMetricsSnapshot } from "./metrics.js";

type OverloadDurations = Map<string, number>;

const SERVER_TYPES = new Set<ComponentType>(["server", "server-large"]);

interface EvaluateUnlockInput {
  graphNodes: ArchitectureNode[];
  nodeMetrics: NodeMetricsSnapshot;
  overloadDurations: OverloadDurations;
}

const updateOverloadDurations = (
  prev: OverloadDurations,
  nodeMetrics: NodeMetricsSnapshot,
  deltaMs: number,
): OverloadDurations => {
  const next = new Map<string, number>();

  for (const [nodeId, metrics] of nodeMetrics) {
    if (metrics.isOverloaded) {
      next.set(nodeId, (prev.get(nodeId) ?? 0) + deltaMs);
    }
  }

  return next;
};

const evaluateUnlockTrigger = (trigger: UnlockTrigger, input: EvaluateUnlockInput): boolean => {
  switch (trigger.type) {
    case "CAPACITY_REACHED":
      return [...input.nodeMetrics.values()].some((m) => m.isOverloaded);

    case "OVERLOAD_SUSTAINED":
      return [...input.overloadDurations.values()].some((ms) => ms >= trigger.durationMs);

    case "SERVERS_PLACED": {
      const count = input.graphNodes.filter((n) => SERVER_TYPES.has(n.componentType)).length;

      return count >= trigger.count;
    }
  }
};

const computeAvailableComponents = (
  baseComponents: ComponentType[],
  componentUnlocks: ComponentUnlock[],
  input: EvaluateUnlockInput,
): ComponentType[] => {
  const seen = new Set<ComponentType>(baseComponents);
  const ordered: ComponentType[] = [...baseComponents];

  for (const unlock of componentUnlocks) {
    if (evaluateUnlockTrigger(unlock.trigger, input)) {
      for (const c of unlock.components) {
        if (!seen.has(c)) {
          seen.add(c);
          ordered.push(c);
        }
      }
    }
  }

  return ordered;
};

export { computeAvailableComponents, evaluateUnlockTrigger, updateOverloadDurations };
export type { OverloadDurations };
