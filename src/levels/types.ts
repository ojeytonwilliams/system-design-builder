import type { ComponentType } from "../components/component-library.js";

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

interface StartingNodePosition {
  x: number;
  y: number;
}

interface StartingNode {
  componentType: ComponentType;
  id: string;
  label: string;
  position: StartingNodePosition;
}

interface StartingEdge {
  id: string;
  source: string;
  target: string;
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
  id: number;
  lockedNodeIds: string[];
  monthlyBudget: number;
  objectiveText: string;
  startingEdges: StartingEdge[];
  startingNodes: StartingNode[];
  timeout: number;
  title: string;
  trafficPeak: number;
  trafficStart: number;
  trafficTarget: number;
}

export type {
  CapacityReachedTrigger,
  CoachMessage,
  ComponentUnlock,
  LevelDefinition,
  OverloadSustainedTrigger,
  ServersPlacedTrigger,
  StartingEdge,
  StartingNode,
  StartingNodePosition,
  UnlockTrigger,
};
