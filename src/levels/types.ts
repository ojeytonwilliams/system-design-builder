import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import type { ComponentType } from "../domain/component-library.js";

interface CapacityReachedTrigger {
  type: "CAPACITY_REACHED";
}

interface OverloadSustainedTrigger {
  durationSeconds: number;
  type: "OVERLOAD_SUSTAINED";
}

interface ServersPlacedTrigger {
  count: number;
  type: "SERVERS_PLACED";
}

type UnlockTrigger = CapacityReachedTrigger | OverloadSustainedTrigger | ServersPlacedTrigger;

interface CoachMessage {
  atSecond: number;
  text: string;
}

interface ComponentUnlock {
  components: ComponentType[];
  trigger: UnlockTrigger;
}

interface LevelDefinition {
  availableComponents: ComponentType[];
  cacheHitRate: number;
  coachMessages: CoachMessage[];
  componentUnlocks: ComponentUnlock[];
  feedbackText: string[];
  id: string;
  lockedNodeIds: string[];
  monthlyBudget: number;
  objectiveText: string;
  startingEdges: ArchitectureEdge[];
  startingNodes: ArchitectureNode[];
  timeout: number;
  title: string;
  trafficPeak: number;
  trafficStart: number;
  trafficTarget: number;
  winSustainMs: number;
}

export type { ComponentUnlock, LevelDefinition, UnlockTrigger };
