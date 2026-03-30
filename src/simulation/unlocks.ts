import type { ComponentType } from "../components/component-library.js";
import type { ComponentUnlock, UnlockTrigger } from "../levels/types.js";
import type { GraphNode, TrafficSnapshot } from "./types.js";

type OverloadDurations = Map<string, number>;

interface EvaluateUnlockInput {
  graphNodes: GraphNode[];
  overloadDurations: OverloadDurations;
  revenue: number;
  revenueTarget: number;
  snapshot: TrafficSnapshot;
}

const updateOverloadDurations = (
  prev: OverloadDurations,
  snapshot: TrafficSnapshot,
): OverloadDurations => {
  const next = new Map<string, number>();

  for (const [nodeId, state] of Object.entries(snapshot)) {
    if (state.droppedOps > 0) {
      next.set(nodeId, (prev.get(nodeId) ?? 0) + 1);
    }
  }

  return next;
};

const evaluateUnlockTrigger = (trigger: UnlockTrigger, input: EvaluateUnlockInput): boolean => {
  switch (trigger.type) {
    case "CAPACITY_REACHED":
      return Object.values(input.snapshot).some((s) => s.droppedOps > 0);

    case "OVERLOAD_SUSTAINED":
      return [...input.overloadDurations.values()].some(
        (ticks) => ticks >= trigger.durationSeconds,
      );

    case "SERVERS_PLACED": {
      const count = input.graphNodes.filter((n) => n.type === "server").length;

      return count >= trigger.count;
    }

    case "LEVEL_COMPLETE":
      return input.revenue >= input.revenueTarget;
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
export type { EvaluateUnlockInput, OverloadDurations };
