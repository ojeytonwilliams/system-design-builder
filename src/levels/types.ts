import type { ArchitectureEdge, ArchitectureNode } from "../domain/canvas-logic.js";
import type { ComponentType } from "../domain/component-library.js";

interface LevelSolution {
  edges: ArchitectureEdge[];
  nodes: ArchitectureNode[];
}

interface CapacityReachedTrigger {
  type: "CAPACITY_REACHED";
}

interface OverloadSustainedTrigger {
  durationMs: number;
  type: "OVERLOAD_SUSTAINED";
}

interface ServersPlacedTrigger {
  count: number;
  type: "SERVERS_PLACED";
}

type UnlockTrigger = CapacityReachedTrigger | OverloadSustainedTrigger | ServersPlacedTrigger;

interface CoachMessage {
  atMs: number;
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
  solutions: LevelSolution[];
  startingEdges: ArchitectureEdge[];
  startingNodes: ArchitectureNode[];
  timeout: number;
  title: string;
  trafficPeak: number;
  trafficStart: number;
  trafficTarget: number;
  winSustainMs: number;
}

export type { ComponentUnlock, LevelDefinition, LevelSolution, UnlockTrigger };
